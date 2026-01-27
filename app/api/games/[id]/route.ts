import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      collections: {
        include: {
          collection: {
            select: { id: true, name: true, type: true, isPrimary: true },
          },
        },
      },
      // Get expansions (games that expand this one)
      relationshipsTo: {
        where: { type: "expands" },
        include: {
          fromGame: {
            select: {
              id: true,
              name: true,
              thumbnail: true,
              selectedThumbnail: true,
              image: true,
              lastScraped: true,
            },
          },
        },
      },
    },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Get expansion IDs that are scraped
  const expansionIds = game.relationshipsTo
    .filter((r) => r.fromGame.lastScraped !== null)
    .map((r) => r.fromGame.id);

  // Check which expansions are in a collection
  const expansionsInCollection = new Set<string>();
  if (expansionIds.length > 0) {
    const memberships = await prisma.collectionGame.findMany({
      where: { gameId: { in: expansionIds } },
      select: { gameId: true },
      distinct: ["gameId"],
    });
    memberships.forEach((m) => expansionsInCollection.add(m.gameId));
  }

  // Build expansions array with inCollection status
  const expansions = game.relationshipsTo
    .filter((r) => r.fromGame.lastScraped !== null)
    .map((r) => ({
      id: r.fromGame.id,
      name: r.fromGame.name,
      thumbnail: r.fromGame.selectedThumbnail || r.fromGame.thumbnail || r.fromGame.image,
      inCollection: expansionsInCollection.has(r.fromGame.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Parse JSON fields
  const parsedGame = {
    ...game,
    isActive: game.collections.length > 0, // Active if in any collection
    categories: game.categories ? JSON.parse(game.categories) : [],
    mechanics: game.mechanics ? JSON.parse(game.mechanics) : [],
    availableImages: game.availableImages ? JSON.parse(game.availableImages) : [],
    componentImages: game.componentImages ? JSON.parse(game.componentImages) : [],
    collections: game.collections.map((cg) => ({
      id: cg.collection.id,
      name: cg.collection.name,
      type: cg.collection.type,
      isPrimary: cg.collection.isPrimary,
    })),
    expansions,
    // Remove the raw relationshipsTo from response
    relationshipsTo: undefined,
  };

  return NextResponse.json({ game: parsedGame });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Handle isActive by adding/removing from primary collection
  if (typeof body.isActive === "boolean") {
    const primaryCollection = await prisma.collection.findFirst({
      where: { isPrimary: true },
    });

    if (primaryCollection) {
      if (body.isActive) {
        // Add to primary collection
        await prisma.collectionGame.upsert({
          where: {
            collectionId_gameId: {
              collectionId: primaryCollection.id,
              gameId: id,
            },
          },
          create: {
            collectionId: primaryCollection.id,
            gameId: id,
            addedBy: "manual",
          },
          update: {},
        });
      } else {
        // Remove from primary collection
        await prisma.collectionGame.deleteMany({
          where: {
            collectionId: primaryCollection.id,
            gameId: id,
          },
        });
      }
    }
  }

  // Fetch updated game
  const updatedGame = await prisma.game.findUnique({
    where: { id },
    include: {
      collections: {
        include: {
          collection: {
            select: { id: true, name: true, type: true, isPrimary: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ game: updatedGame });
}
