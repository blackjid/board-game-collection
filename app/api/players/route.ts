import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createPlayer, listPlayers, searchPlayers } from "@/lib/players";
import type { CreatePlayerInput } from "@/types/player";

/**
 * GET /api/players
 * List or search players
 * Query params: search (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;

    // Use lightweight search for autocomplete, full list for management
    if (search) {
      const players = await searchPlayers(search);
      return NextResponse.json({ players });
    } else {
      const players = await listPlayers();
      return NextResponse.json({ players });
    }
  } catch (error) {
    console.error("Error listing players:", error);
    return NextResponse.json(
      { error: "Failed to list players" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/players
 * Create a new player
 * Body: CreatePlayerInput
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body: CreatePlayerInput = await request.json();

    // Validation
    if (!body.displayName || body.displayName.trim() === "") {
      return NextResponse.json(
        { error: "displayName is required" },
        { status: 400 }
      );
    }

    const player = await createPlayer({
      displayName: body.displayName.trim(),
      firstName: body.firstName?.trim(),
      lastName: body.lastName?.trim(),
    });

    return NextResponse.json({ player }, { status: 201 });
  } catch (error) {
    console.error("Error creating player:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create player" },
      { status: 500 }
    );
  }
}
