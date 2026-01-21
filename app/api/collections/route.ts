import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/slug";

/**
 * GET /api/collections
 * List all custom collections
 */
export async function GET() {
  try {
    const collections = await prisma.collection.findMany({
      include: {
        games: {
          include: {
            game: {
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
          orderBy: { addedAt: "desc" },
        },
        _count: {
          select: { games: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Transform to include game count and preview images
    const result = collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      type: collection.type,
      isPrimary: collection.isPrimary,
      isPublic: collection.isPublic,
      shareToken: collection.shareToken,
      gameCount: collection._count.games,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      // Preview: first 4 game thumbnails
      previewImages: collection.games
        .slice(0, 4)
        .map((cg) => cg.game.selectedThumbnail || cg.game.thumbnail || cg.game.image)
        .filter(Boolean),
    }));

    return NextResponse.json({ collections: result });
  } catch (error) {
    console.error("Failed to list collections:", error);
    return NextResponse.json(
      { error: "Failed to list collections" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/collections
 * Create a new custom collection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, isPublic } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      );
    }

    // Generate a unique slug from the name
    const slug = await generateUniqueSlug(name.trim());

    const collection = await prisma.collection.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        isPublic: isPublic === true,
      },
    });

    return NextResponse.json({
      collection: {
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        isPublic: collection.isPublic,
        shareToken: collection.shareToken,
        gameCount: 0,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
        previewImages: [],
      },
    });
  } catch (error) {
    console.error("Failed to create collection:", error);
    return NextResponse.json(
      { error: "Failed to create collection" },
      { status: 500 }
    );
  }
}
