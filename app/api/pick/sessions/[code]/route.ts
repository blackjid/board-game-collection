import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface Params {
  params: Promise<{ code: string }>;
}

/**
 * GET /api/pick/sessions/[code]
 * Get session info, players, and games for the session
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { code } = await params;

    const session = await prisma.pickSession.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        players: {
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Parse the game IDs and fetch game data
    const gameIds: string[] = JSON.parse(session.gameIdsJson);
    const games = await prisma.game.findMany({
      where: {
        id: { in: gameIds },
      },
    });

    // Parse JSON fields in games
    const parsedGames = games.map((game) => ({
      id: game.id,
      name: game.name,
      yearPublished: game.yearPublished,
      image: game.selectedThumbnail || game.image || game.thumbnail,
      description: game.description,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      minPlaytime: game.minPlaytime,
      maxPlaytime: game.maxPlaytime,
      rating: game.rating,
      minAge: game.minAge,
      isExpansion: game.isExpansion,
      categories: game.categories ? JSON.parse(game.categories) : [],
      mechanics: game.mechanics ? JSON.parse(game.mechanics) : [],
    }));

    // Maintain the order from gameIds
    const orderedGames = gameIds
      .map((id) => parsedGames.find((g) => g.id === id))
      .filter(Boolean);

    return NextResponse.json({
      session: {
        id: session.id,
        code: session.code,
        hostName: session.hostName,
        status: session.status,
        filters: JSON.parse(session.filtersJson),
        createdAt: session.createdAt,
        completedAt: session.completedAt,
      },
      players: session.players.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        status: p.status,
        progress: p.progress,
        joinedAt: p.joinedAt,
      })),
      games: orderedGames,
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}
