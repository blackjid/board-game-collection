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
    },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

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
