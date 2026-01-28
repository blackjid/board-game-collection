import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getBggClient } from "@/lib/bgg";

interface BggSearchResultWithCollection {
  id: string;
  name: string;
  yearPublished: number | null;
  thumbnail: string | null;
  isInMainCollection: boolean;
  isExpansion: boolean;
}

/**
 * GET /api/bgg/search?q=<query>
 * Search BoardGameGeek for games by name using the BGG client
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: "Search query must be at least 2 characters" },
      { status: 400 }
    );
  }

  try {
    const client = getBggClient();

    // Search BGG for games
    let searchResults = await client.search(query, 15);

    // If no results from search, try hotness as fallback
    if (searchResults.length === 0) {
      const hotGames = await client.getHotGames();
      const queryLower = query.toLowerCase();
      searchResults = hotGames
        .filter((game) => game.name.toLowerCase().includes(queryLower))
        .slice(0, 15)
        .map((game) => ({
          id: game.id,
          name: game.name,
          yearPublished: game.yearPublished,
          thumbnail: game.thumbnail,
          isExpansion: false, // Hotness typically only includes base games
        }));
    }

    // If still no results, return games from our own database that match
    if (searchResults.length === 0) {
      const localGames = await prisma.game.findMany({
        where: {
          name: { contains: query },
        },
        include: {
          collections: {
            include: {
              collection: {
                select: { isPrimary: true },
              },
            },
          },
        },
        take: 15,
        orderBy: { rating: "desc" },
      });

      const results: BggSearchResultWithCollection[] = localGames.map((game) => ({
        id: game.id,
        name: game.name,
        yearPublished: game.yearPublished,
        thumbnail: game.selectedThumbnail || game.thumbnail || game.image,
        isInMainCollection: game.collections.some((cg) => cg.collection.isPrimary),
        isExpansion: game.isExpansion,
      }));

      return NextResponse.json({ results });
    }

    // Get IDs of games from search results
    const gameIds = searchResults.map((item) => item.id);

    // Get primary collection
    const primaryCollection = await prisma.collection.findFirst({
      where: { isPrimary: true },
      select: { id: true },
    });

    // Find which games are in the primary collection
    const mainCollectionIds = new Set<string>();
    if (primaryCollection) {
      const existingLinks = await prisma.collectionGame.findMany({
        where: {
          collectionId: primaryCollection.id,
          gameId: { in: gameIds },
        },
        select: { gameId: true },
      });
      existingLinks.forEach((link) => mainCollectionIds.add(link.gameId));
    }

    // Map search results to include collection status
    const results: BggSearchResultWithCollection[] = searchResults.map((item) => ({
      id: item.id,
      name: item.name,
      yearPublished: item.yearPublished,
      thumbnail: item.thumbnail,
      isInMainCollection: mainCollectionIds.has(item.id),
      isExpansion: item.isExpansion,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("BGG search failed:", error);
    return NextResponse.json(
      { error: "Failed to search BoardGameGeek" },
      { status: 500 }
    );
  }
}
