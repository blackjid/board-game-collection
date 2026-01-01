import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface Params {
  params: Promise<{ code: string }>;
}

interface EndSessionBody {
  playerId: string;
}

/**
 * Vote data for a game - only stores vote-related info, not game metadata.
 * Game name/image/rating should be fetched from the Game table at display time.
 */
interface GameVoteResult {
  id: string;  // Game ID - used to join with Game table
  likes: number;
  picks: number;
  skips: number;
  likedBy: string[];
  pickedBy: string[];
  isUnanimous: boolean;
}

/**
 * Compute and return the final results for a session.
 * This function performs the random shuffle for ties ONCE.
 * Only stores vote data, not game metadata (name/image/rating).
 */
async function computeFinalResults(sessionId: string): Promise<{
  unanimousMatches: GameVoteResult[];
  rankedResults: GameVoteResult[];
}> {
  const session = await prisma.pickSession.findUnique({
    where: { id: sessionId },
    include: {
      players: true,
      votes: true,
    },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  const gameIds: string[] = JSON.parse(session.gameIdsJson);
  const playerMap = new Map(session.players.map((p) => [p.id, p.name]));
  const totalPlayers = session.players.length;

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

  // Build results - only vote data, no game metadata
  const results: GameVoteResult[] = [];

  for (const [gameId, votes] of gameVotes) {
    const totalPositive = votes.likes.length + votes.picks.length;
    const isUnanimous = totalPositive === totalPlayers && totalPlayers > 0;

    results.push({
      id: gameId,
      likes: votes.likes.length,
      picks: votes.picks.length,
      skips: votes.skips.length,
      likedBy: votes.likes,
      pickedBy: votes.picks,
      isUnanimous,
    });
  }

  // Shuffle first to randomize ties, then stable sort by score
  // Fisher-Yates shuffle - this happens ONCE when session ends
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

  return { unanimousMatches, rankedResults };
}

/**
 * POST /api/pick/sessions/[code]/end
 * End the session (host only)
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { code } = await params;
    const body: EndSessionBody = await request.json();
    const { playerId } = body;

    if (!playerId) {
      return NextResponse.json(
        { error: "Missing required field: playerId" },
        { status: 400 }
      );
    }

    const session = await prisma.pickSession.findUnique({
      where: { code: code.toUpperCase() },
      include: { players: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Verify the player is the host
    const player = session.players.find((p) => p.id === playerId);
    if (!player?.isHost) {
      return NextResponse.json(
        { error: "Only the host can end the session" },
        { status: 403 }
      );
    }

    // Compute final results ONCE with randomization for ties
    const finalResults = await computeFinalResults(session.id);

    // Determine the winner (first unanimous match, or first ranked result)
    const winnerGameId =
      finalResults.unanimousMatches[0]?.id ||
      finalResults.rankedResults[0]?.id ||
      null;

    // Update session status and persist the final results
    await prisma.pickSession.update({
      where: { id: session.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        finalResultsJson: JSON.stringify(finalResults),
        winnerGameId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error ending session:", error);
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 }
    );
  }
}
