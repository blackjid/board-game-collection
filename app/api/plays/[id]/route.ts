import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getGamePlayById, updateGamePlay, deleteGamePlay } from "@/lib/plays";
import type { UpdateGamePlayInput } from "@/types/play";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/plays/[id]
 * Get a single game play by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const play = await getGamePlayById(id);

    if (!play) {
      return NextResponse.json(
        { error: "Play not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ play });
  } catch (error) {
    console.error("Error fetching play:", error);
    return NextResponse.json(
      { error: "Failed to fetch play" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/plays/[id]
 * Update a game play record
 * Only the user who logged it can update it
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body: UpdateGamePlayInput = await request.json();

    // Validate players if provided
    if (body.players) {
      if (!Array.isArray(body.players) || body.players.length === 0) {
        return NextResponse.json(
          { error: "At least one player is required" },
          { status: 400 }
        );
      }

      for (const player of body.players) {
        if (!player.name || player.name.trim() === "") {
          return NextResponse.json(
            { error: "All players must have a name" },
            { status: 400 }
          );
        }
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

    const play = await updateGamePlay(id, user.id, body);

    return NextResponse.json({ play });
  } catch (error) {
    console.error("Error updating play:", error);

    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      if (error.message === "Play not found") {
        return NextResponse.json(
          { error: "Play not found" },
          { status: 404 }
        );
      }

      if (error.message.includes("Unauthorized:")) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to update play" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/plays/[id]
 * Delete a game play record
 * Only the user who logged it can delete it
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    await deleteGamePlay(id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting play:", error);

    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      if (error.message === "Play not found") {
        return NextResponse.json(
          { error: "Play not found" },
          { status: 404 }
        );
      }

      if (error.message.includes("Unauthorized:")) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to delete play" },
      { status: 500 }
    );
  }
}
