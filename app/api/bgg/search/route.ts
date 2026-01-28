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

interface GeekdoSearchItem {
  objectid: string;
  name: string;
  yearpublished?: string;
  subtype?: string;
  thumbnail?: string;
}

interface GeekdoSearchResponse {
  items?: GeekdoSearchItem[];
}

/**
 * GET /api/bgg/search?q=<query>
 * Search BoardGameGeek for games by name
 * Uses Geekdo JSON API for better search accuracy, falls back to XML API v2
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
    let searchResults: Array<{
      id: string;
      name: string;
      yearPublished: number | null;
      thumbnail: string | null;
      isExpansion: boolean;
    }> = [];

    // Try Geekdo autocomplete API first (more accurate search)
    try {
      const geekdoUrl = `https://boardgamegeek.com/search/boardgame?q=${encodeURIComponent(query)}&showcount=15`;
      const geekdoResponse = await fetch(geekdoUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      if (geekdoResponse.ok) {
        const data: GeekdoSearchResponse = await geekdoResponse.json();
        const items = data.items || [];
        
        if (items.length > 0) {
          // Get game IDs and fetch full details from XML API for thumbnails
          const gameIds = items.map((item) => item.objectid);
          const details = await client.getGamesDetails(gameIds);
          const detailsMap = new Map(details.map((d) => [d.id, d]));

          searchResults = items.map((item) => {
            const detail = detailsMap.get(item.objectid);
            return {
              id: item.objectid,
              name: item.name,
              yearPublished: item.yearpublished ? parseInt(item.yearpublished, 10) : null,
              thumbnail: detail?.thumbnail || item.thumbnail || null,
              isExpansion: item.subtype === "boardgameexpansion",
            };
          });
        }
      }
    } catch (error) {
      console.log("[Search] Geekdo API failed, falling back to XML API:", error);
    }

    // Fallback to XML API v2 search if Geekdo API fails or returns no results
    if (searchResults.length === 0) {
      searchResults = await client.search(query, 15);
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
