import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/collections/[id]/duplicate
 * Duplicate a collection with a new name
 * Only copies games that exist in the primary collection
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: sourceCollectionId } = await params;

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    // Check source collection exists
    const sourceCollection = await prisma.collection.findUnique({
      where: { id: sourceCollectionId },
      include: {
        games: {
          include: {
            game: true,
          },
        },
      },
    });

    if (!sourceCollection) {
      return NextResponse.json(
        { error: "Source collection not found" },
        { status: 404 }
      );
    }

    // Get primary collection
    const primaryCollection = await prisma.collection.findFirst({
      where: { isPrimary: true },
      include: {
        games: {
          select: {
            gameId: true,
          },
        },
      },
    });

    if (!primaryCollection) {
      return NextResponse.json(
        { error: "Primary collection not found" },
        { status: 404 }
      );
    }

    // Get set of game IDs in primary collection
    const primaryGameIds = new Set(
      primaryCollection.games.map((cg) => cg.gameId)
    );

    // Filter games that are in primary collection
    const gamesToCopy = sourceCollection.games.filter((cg) =>
      primaryGameIds.has(cg.gameId)
    );

    // Create new collection
    const newCollection = await prisma.collection.create({
      data: {
        name: name.trim(),
        description: sourceCollection.description,
        type: "manual",
        isPrimary: false,
      },
    });

    // Add games to new collection
    if (gamesToCopy.length > 0) {
      await prisma.collectionGame.createMany({
        data: gamesToCopy.map((cg) => ({
          collectionId: newCollection.id,
          gameId: cg.gameId,
          addedBy: "manual",
        })),
      });
    }

    return NextResponse.json({
      collection: {
        id: newCollection.id,
        name: newCollection.name,
        description: newCollection.description,
        gameCount: gamesToCopy.length,
        createdAt: newCollection.createdAt,
        updatedAt: newCollection.updatedAt,
      },
      gamesAdded: gamesToCopy.length,
      gamesSkipped: sourceCollection.games.length - gamesToCopy.length,
    });
  } catch (error) {
    console.error("Failed to duplicate collection:", error);
    return NextResponse.json(
      { error: "Failed to duplicate collection" },
      { status: 500 }
    );
  }
}
