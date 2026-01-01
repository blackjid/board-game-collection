import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseJsonArray(json: string | null): string[] {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

/**
 * GET /api/collections/[id]
 * Get a single collection with all its games
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        games: {
          include: {
            game: true,
          },
          orderBy: { addedAt: "desc" },
        },
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Transform games to include parsed JSON fields
    const games = collection.games.map((cg) => ({
      id: cg.game.id,
      name: cg.game.name,
      yearPublished: cg.game.yearPublished,
      image: cg.game.selectedThumbnail || cg.game.image || cg.game.thumbnail,
      thumbnail: cg.game.thumbnail,
      selectedThumbnail: cg.game.selectedThumbnail,
      description: cg.game.description,
      minPlayers: cg.game.minPlayers,
      maxPlayers: cg.game.maxPlayers,
      minPlaytime: cg.game.minPlaytime,
      maxPlaytime: cg.game.maxPlaytime,
      rating: cg.game.rating,
      minAge: cg.game.minAge,
      isExpansion: cg.game.isExpansion,
      lastScraped: cg.game.lastScraped,
      categories: parseJsonArray(cg.game.categories),
      mechanics: parseJsonArray(cg.game.mechanics),
      componentImages: parseJsonArray(cg.game.componentImages),
      availableImages: parseJsonArray(cg.game.availableImages),
      addedAt: cg.addedAt,
    }));

    return NextResponse.json({
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        gameCount: games.length,
        games,
      },
    });
  } catch (error) {
    console.error("Failed to get collection:", error);
    return NextResponse.json(
      { error: "Failed to get collection" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/collections/[id]
 * Update collection name/description
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { name, description } = body;

    // Validate that at least one field is being updated
    if (name === undefined && description === undefined) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Check collection exists
    const existing = await prisma.collection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: { name?: string; description?: string | null } = {};
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Collection name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    const collection = await prisma.collection.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { games: true } },
      },
    });

    return NextResponse.json({
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        gameCount: collection._count.games,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
      },
    });
  } catch (error) {
    console.error("Failed to update collection:", error);
    return NextResponse.json(
      { error: "Failed to update collection" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/collections/[id]
 * Delete a collection (does not delete games, just the association)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    // Check collection exists
    const existing = await prisma.collection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Delete collection (cascades to CollectionGame entries)
    await prisma.collection.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete collection:", error);
    return NextResponse.json(
      { error: "Failed to delete collection" },
      { status: 500 }
    );
  }
}
