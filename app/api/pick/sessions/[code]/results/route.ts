import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Game, PickSessionPlayer } from "@prisma/client";

interface Params {
  params: Promise<{ code: string }>;
}

type GameMetadata = { name: string; image: string | null; rating: number | null };

/**
 * Full game result with vote data AND game metadata (for API response)
 */
interface GameResult {
  id: string;
  name: string;
  image: string | null;
  rating: number | null;
  likes: number;
  picks: number;
  skips: number;
  likedBy: string[];
  pickedBy: string[];
  isUnanimous: boolean;
}

/**
 * Vote data only (persisted in finalResultsJson - no game metadata)
 */
interface GameVoteResult {
  id: string;
  likes: number;
  picks: number;
  skips: number;
  likedBy: string[];
  pickedBy: string[];
  isUnanimous: boolean;
}

interface PersistedResults {
  unanimousMatches: GameVoteResult[];
  rankedResults: GameVoteResult[];
}

/**
 * Hydrate vote results with fresh game metadata from the database.
 */
function hydrateResults(
  voteResults: GameVoteResult[],
  gameMap: Map<string, { name: string; image: string | null; rating: number | null }>
): GameResult[] {
  return voteResults.map((vote) => {
    const game = gameMap.get(vote.id);
    return {
      ...vote,
      name: game?.name || "Unknown Game",
      image: game?.image || null,
      rating: game?.rating || null,
    };
  });
}

/**
 * GET /api/pick/sessions/[code]/results
 * Get aggregated results for the session
 *
 * For completed sessions, returns the persisted final results to ensure
 * all clients see the same winner (random tie-breaking happens once when
 * the session ends, not on each results request).
 *
 * Vote order is persisted; game metadata (name/image/rating) is fetched
 * fresh from the Game table to avoid stale data.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { code } = await params;

    const session = await prisma.pickSession.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        players: true,
        votes: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const gameIds: string[] = JSON.parse(session.gameIdsJson);
    const totalPlayers = session.players.length;

    // If session is completed and has persisted results, hydrate with game data
    // This ensures all clients see the same winner order while using fresh game metadata
    if (session.status === "completed" && session.finalResultsJson) {
      const persistedResults: PersistedResults = JSON.parse(session.finalResultsJson);

      // Fetch fresh game metadata
      const allResultIds = [
        ...persistedResults.unanimousMatches.map((r) => r.id),
        ...persistedResults.rankedResults.map((r) => r.id),
      ];
      const games = await prisma.game.findMany({
        where: { id: { in: allResultIds } },
        select: { id: true, name: true, selectedThumbnail: true, image: true, thumbnail: true, rating: true },
      });
      const gameMap = new Map<string, GameMetadata>(
        games.map((g: Pick<Game, "id" | "name" | "selectedThumbnail" | "image" | "thumbnail" | "rating">) => [g.id, {
          name: g.name,
          image: g.selectedThumbnail || g.image || g.thumbnail,
          rating: g.rating,
        }])
      );

      // Hydrate vote results with game metadata
      const unanimousMatches = hydrateResults(persistedResults.unanimousMatches, gameMap);
      const rankedResults = hydrateResults(persistedResults.rankedResults, gameMap);

      return NextResponse.json({
        session: {
          code: session.code,
          hostName: session.hostName,
          status: session.status,
          totalGames: gameIds.length,
          totalPlayers,
        },
        players: session.players.map((p: PickSessionPlayer) => ({
          id: p.id,
          name: p.name,
          isHost: p.isHost,
          status: p.status,
        })),
        unanimousMatches,
        rankedResults,
        hasUnanimousMatch: unanimousMatches.length > 0,
      });
    }

    // For active sessions or sessions without persisted results (legacy),
    // compute results on the fly (but note: this can cause inconsistency
    // if called multiple times due to random shuffle for ties)
    const games = await prisma.game.findMany({
      where: { id: { in: gameIds } },
    });

    const gameMap = new Map<string, Game>(games.map((g: Game) => [g.id, g]));
    const playerMap = new Map<string, string>(session.players.map((p: PickSessionPlayer) => [p.id, p.name]));

    // Aggregate votes by game
    const gameVotes: Map<string, { likes: string[]; picks: string[]; skips: string[] }> = new Map();

    for (const gameId of gameIds) {
      gameVotes.set(gameId, { likes: [], picks: [], skips: [] });
    }

    for (const vote of session.votes) {
      const gameData = gameVotes.get(vote.gameId);
      if (gameData) {
        const playerName = playerMap.get(vote.playerId) || "Unknown";
        if (vote.decision === "like") {
          gameData.likes.push(playerName);
        } else if (vote.decision === "pick") {
          gameData.picks.push(playerName);
        } else if (vote.decision === "skip") {
          gameData.skips.push(playerName);
        }
      }
    }

    // Build results
    const results: GameResult[] = [];

    for (const [gameId, votes] of gameVotes) {
      const game: Game | undefined = gameMap.get(gameId);
      if (!game) continue;

      const totalPositive = votes.likes.length + votes.picks.length;
      const isUnanimous = totalPositive === totalPlayers && totalPlayers > 0;

      results.push({
        id: game.id,
        name: game.name,
        image: game.selectedThumbnail || game.image || game.thumbnail,
        rating: game.rating,
        likes: votes.likes.length,
        picks: votes.picks.length,
        skips: votes.skips.length,
        likedBy: votes.likes,
        pickedBy: votes.picks,
        isUnanimous,
      });
    }

    // Shuffle first to randomize ties, then stable sort by score
    // Fisher-Yates shuffle
    for (let i = results.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [results[i], results[j]] = [results[j], results[i]];
    }

    // Sort: unanimous first, then by likes descending (ties are already randomized)
    results.sort((a, b) => {
      if (a.isUnanimous !== b.isUnanimous) {
        return a.isUnanimous ? -1 : 1;
      }
      const scoreA = a.likes;
      const scoreB = b.likes;
      return scoreB - scoreA;
    });

    // Separate unanimous matches from ranked
    const unanimousMatches = results.filter((r) => r.isUnanimous);
    const rankedResults = results.filter((r) => !r.isUnanimous && (r.likes > 0 || r.picks > 0));

    return NextResponse.json({
      session: {
        code: session.code,
        hostName: session.hostName,
        status: session.status,
        totalGames: gameIds.length,
        totalPlayers,
      },
      players: session.players.map((p: PickSessionPlayer) => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        status: p.status,
      })),
      unanimousMatches,
      rankedResults,
      hasUnanimousMatch: unanimousMatches.length > 0,
    });
  } catch (error) {
    console.error("Error fetching results:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}
