import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { enqueueScrape } from "@/lib/scrape-queue";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface AddGameBody {
  gameId: string;
  // Optional: for games from BGG search that don't exist locally
  name?: string;
  yearPublished?: number | null;
  isExpansion?: boolean;
  // Optional: who contributed this game to the list (null = me/owner)
  contributorId?: string | null;
}

/**
 * POST /api/collections/[id]/games
 * Add a game to a collection
 * If the game doesn't exist locally, it will be created and queued for scraping
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: collectionId } = await params;

  try {
    const body: AddGameBody = await request.json();
    const { gameId, name, yearPublished, isExpansion, contributorId } = body;

    if (!gameId) {
      return NextResponse.json(
        { error: "gameId is required" },
        { status: 400 }
      );
    }

    // Check collection exists
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Check if game already in this collection
    const existingLink = await prisma.collectionGame.findUnique({
      where: {
        collectionId_gameId: { collectionId, gameId },
      },
    });
    if (existingLink) {
      return NextResponse.json(
        { error: "Game is already in this collection" },
        { status: 400 }
      );
    }

    // Check if game exists locally
    let game = await prisma.game.findUnique({ where: { id: gameId } });
    let wasCreated = false;

    if (!game) {
      // Game doesn't exist - create it as a manual addition
      if (!name) {
        return NextResponse.json(
          { error: "name is required for games not in the database" },
          { status: 400 }
        );
      }

      game = await prisma.game.create({
        data: {
          id: gameId,
          name,
          yearPublished: yearPublished ?? null,
          isExpansion: isExpansion ?? false,
        },
      });
      wasCreated = true;

      // Queue for background scraping
      enqueueScrape(gameId, name);
    }

    // Add game to collection
    const collectionGame = await prisma.collectionGame.create({
      data: {
        collectionId,
        gameId,
        contributorId: contributorId ?? null,
      },
      include: {
        game: true,
        contributor: true,
      },
    });

    // Update collection's updatedAt
    await prisma.collection.update({
      where: { id: collectionId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      wasCreated,
      queuedForScraping: wasCreated,
      game: {
        id: collectionGame.game.id,
        name: collectionGame.game.name,
        yearPublished: collectionGame.game.yearPublished,
        thumbnail:
          collectionGame.game.selectedThumbnail ||
          collectionGame.game.thumbnail ||
          collectionGame.game.image,
        lastScraped: collectionGame.game.lastScraped,
        addedAt: collectionGame.addedAt,
        contributorId: collectionGame.contributorId,
        contributor: collectionGame.contributor
          ? {
              id: collectionGame.contributor.id,
              displayName: collectionGame.contributor.displayName,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Failed to add game to collection:", error);
    return NextResponse.json(
      { error: "Failed to add game to collection" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/collections/[id]/games
 * Update a game's metadata in a collection (e.g., contributor)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id: collectionId } = await params;

  try {
    const body = await request.json();
    const { gameId, contributorId } = body;

    if (!gameId) {
      return NextResponse.json(
        { error: "gameId is required" },
        { status: 400 }
      );
    }

    // Check collection exists
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Check if game is in this collection
    const existingLink = await prisma.collectionGame.findUnique({
      where: {
        collectionId_gameId: { collectionId, gameId },
      },
    });
    if (!existingLink) {
      return NextResponse.json(
        { error: "Game is not in this collection" },
        { status: 404 }
      );
    }

    // Update the contributor
    const updatedCollectionGame = await prisma.collectionGame.update({
      where: {
        collectionId_gameId: { collectionId, gameId },
      },
      data: {
        contributorId: contributorId ?? null,
      },
      include: {
        game: true,
        contributor: true,
      },
    });

    // Update collection's updatedAt
    await prisma.collection.update({
      where: { id: collectionId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      game: {
        id: updatedCollectionGame.game.id,
        name: updatedCollectionGame.game.name,
        contributorId: updatedCollectionGame.contributorId,
        contributor: updatedCollectionGame.contributor
          ? {
              id: updatedCollectionGame.contributor.id,
              displayName: updatedCollectionGame.contributor.displayName,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Failed to update game in collection:", error);
    return NextResponse.json(
      { error: "Failed to update game in collection" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/collections/[id]/games
 * Remove a game from a collection (does not delete the game itself)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: collectionId } = await params;

  try {
    const body = await request.json();
    const { gameId } = body;

    if (!gameId) {
      return NextResponse.json(
        { error: "gameId is required" },
        { status: 400 }
      );
    }

    // Check collection exists
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Check if game is in this collection
    const existingLink = await prisma.collectionGame.findUnique({
      where: {
        collectionId_gameId: { collectionId, gameId },
      },
    });
    if (!existingLink) {
      return NextResponse.json(
        { error: "Game is not in this collection" },
        { status: 404 }
      );
    }

    // Remove the link
    await prisma.collectionGame.delete({
      where: {
        collectionId_gameId: { collectionId, gameId },
      },
    });

    // Update collection's updatedAt
    await prisma.collection.update({
      where: { id: collectionId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove game from collection:", error);
    return NextResponse.json(
      { error: "Failed to remove game from collection" },
      { status: 500 }
    );
  }
}
