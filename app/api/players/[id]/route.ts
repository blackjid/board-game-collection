import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPlayerById, updatePlayer, deletePlayer } from "@/lib/players";
import type { UpdatePlayerInput } from "@/types/player";

/**
 * GET /api/players/[id]
 * Get a single player by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const player = await getPlayerById(id);

    if (!player) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ player });
  } catch (error) {
    console.error("Error fetching player:", error);
    return NextResponse.json(
      { error: "Failed to fetch player" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/players/[id]
 * Update a player
 * Body: UpdatePlayerInput
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body: UpdatePlayerInput = await request.json();

    // Validation
    if (body.displayName !== undefined && body.displayName.trim() === "") {
      return NextResponse.json(
        { error: "displayName cannot be empty" },
        { status: 400 }
      );
    }

    const player = await updatePlayer(id, {
      ...(body.displayName !== undefined && { displayName: body.displayName.trim() }),
      ...(body.firstName !== undefined && { firstName: body.firstName?.trim() }),
      ...(body.lastName !== undefined && { lastName: body.lastName?.trim() }),
    });

    return NextResponse.json({ player });
  } catch (error) {
    console.error("Error updating player:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update player" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/players/[id]
 * Delete a player
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await deletePlayer(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting player:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete player" },
      { status: 500 }
    );
  }
}
