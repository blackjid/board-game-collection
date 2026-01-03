import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { createGamePlay, listGamePlays } from "@/lib/plays";
import type { CreateGamePlayInput } from "@/types/play";

/**
 * GET /api/plays
 * List game plays with optional filters
 * Query params: gameId, userId, limit
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gameId = searchParams.get("gameId") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : undefined;

    const plays = await listGamePlays({ gameId, userId, limit });

    return NextResponse.json({ plays });
  } catch (error) {
    console.error("Error listing plays:", error);
    return NextResponse.json(
      { error: "Failed to list plays" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/plays
 * Create a new game play record
 * Body: CreateGamePlayInput
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body: CreateGamePlayInput = await request.json();

    // Validation
    if (!body.gameId) {
      return NextResponse.json(
        { error: "gameId is required" },
        { status: 400 }
      );
    }

    if (!body.players || !Array.isArray(body.players) || body.players.length === 0) {
      return NextResponse.json(
        { error: "At least one player is required" },
        { status: 400 }
      );
    }

    // Validate players
    for (const player of body.players) {
      if (!player.name || player.name.trim() === "") {
        return NextResponse.json(
          { error: "All players must have a name" },
          { status: 400 }
        );
      }
    }

    // Validate duration if provided
    if (body.duration !== undefined && body.duration !== null) {
      if (body.duration < 0) {
        return NextResponse.json(
          { error: "Duration must be a positive number" },
          { status: 400 }
        );
      }
    }

    const play = await createGamePlay(user.id, body);

    return NextResponse.json({ play }, { status: 201 });
  } catch (error) {
    console.error("Error creating play:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create play" },
      { status: 500 }
    );
  }
}
