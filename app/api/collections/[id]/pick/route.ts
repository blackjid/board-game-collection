import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface GameData {
  id: string;
  name: string;
  yearPublished: number | null;
  image: string | null;
  thumbnail: string | null;
  selectedThumbnail: string | null;
  description: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  minPlaytime: number | null;
  maxPlaytime: number | null;
  rating: number | null;
  minAge: number | null;
  isExpansion: boolean;
  categories: string[];
  mechanics: string[];
  componentImages: string[];
  availableImages: string[];
}

function parseJsonField(value: string | null): string[] {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

/**
 * GET /api/collections/[id]/pick
 * Get collection data formatted for the picker (same format as /api/pick)
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
        },
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Filter to only scraped games (have details) and transform
    const games: GameData[] = collection.games
      .filter((cg) => cg.game.lastScraped !== null)
      .map((cg) => {
        const game = cg.game;
        const mainImage = game.selectedThumbnail || game.image || game.thumbnail;

        return {
          id: game.id,
          name: game.name,
          yearPublished: game.yearPublished,
          image: mainImage,
          thumbnail: game.thumbnail,
          selectedThumbnail: game.selectedThumbnail,
          description: game.description,
          minPlayers: game.minPlayers,
          maxPlayers: game.maxPlayers,
          minPlaytime: game.minPlaytime,
          maxPlaytime: game.maxPlaytime,
          rating: game.rating,
          minAge: game.minAge,
          isExpansion: game.isExpansion,
          categories: parseJsonField(game.categories),
          mechanics: parseJsonField(game.mechanics),
          componentImages: parseJsonField(game.componentImages),
          availableImages: parseJsonField(game.availableImages),
        };
      });

    return NextResponse.json({
      collectionId: collection.id,
      collectionName: collection.name,
      games,
    });
  } catch (error) {
    console.error("Failed to get collection for picker:", error);
    return NextResponse.json(
      { error: "Failed to get collection" },
      { status: 500 }
    );
  }
}
