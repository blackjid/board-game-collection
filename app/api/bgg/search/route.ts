import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface BggSearchResult {
  id: string;
  name: string;
  yearPublished: number | null;
  thumbnail: string | null;
  isInMainCollection: boolean;
  isExpansion: boolean;
}

interface GeekItemResponse {
  item?: {
    objectid?: string;
    name?: string;
    yearpublished?: string;
    subtype?: string;
    images?: {
      thumb?: string;
      square200?: string;
    };
  };
}

interface HotnessItem {
  objectid: string;
  name: string;
  yearpublished?: string;
  subtype?: string;
  thumbnail?: string;
}

interface HotnessResponse {
  items?: HotnessItem[];
}

/**
 * GET /api/bgg/search?q=<query>
 * Search BoardGameGeek for games by name using internal JSON API
 * Uses the suggest endpoint for autocomplete-style search
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
    // Try the BGG suggest/autocomplete API
    const suggestUrl = `https://boardgamegeek.com/search/boardgame?q=${encodeURIComponent(query)}&showcount=15`;
    const suggestResponse = await fetch(suggestUrl, {
      headers: {
        'Accept': 'application/json',
      }
    });

    let items: HotnessItem[] = [];

    if (suggestResponse.ok) {
      try {
        const data: HotnessResponse = await suggestResponse.json();
        items = data.items || [];
      } catch {
        // Response might not be JSON, try alternative approach
      }
    }

    // If no items, try fetching from geekdo API with objectids from hotness
    if (items.length === 0) {
      // Fallback: search through hotness/trending which often has searchable games
      const hotnessUrl = `https://api.geekdo.com/api/hotness?objecttype=thing&geeklists=0&objectid=0&nosession=1`;
      const hotnessResponse = await fetch(hotnessUrl);

      if (hotnessResponse.ok) {
        const hotnessData: HotnessResponse = await hotnessResponse.json();
        const allItems = hotnessData.items || [];

        // Filter hotness items by query (simple string matching)
        const queryLower = query.toLowerCase();
        items = allItems.filter(item =>
          item.name?.toLowerCase().includes(queryLower)
        ).slice(0, 15);
      }
    }

    // If still no items, return games from our own database that match
    if (items.length === 0) {
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
        orderBy: { rating: 'desc' },
      });

      const results: BggSearchResult[] = localGames.map(game => ({
        id: game.id,
        name: game.name,
        yearPublished: game.yearPublished,
        thumbnail: game.selectedThumbnail || game.thumbnail || game.image,
        isInMainCollection: game.collections.some(cg => cg.collection.isPrimary),
        isExpansion: game.isExpansion,
      }));

      return NextResponse.json({ results });
    }

    // Get IDs of games we already have in the primary collection
    const gameIds = items.map((item) => item.objectid);

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
      existingLinks.forEach(link => mainCollectionIds.add(link.gameId));
    }

    // Enrich items with additional details from geekitems API
    const results: BggSearchResult[] = await Promise.all(
      items.map(async (item): Promise<BggSearchResult> => {
        try {
          const detailResponse = await fetch(
            `https://api.geekdo.com/api/geekitems?objecttype=thing&objectid=${item.objectid}&nosession=1`
          );

          if (detailResponse.ok) {
            const detailData: GeekItemResponse = await detailResponse.json();
            const detail = detailData.item;

            if (detail) {
              return {
                id: item.objectid,
                name: detail.name || item.name,
                yearPublished: detail.yearpublished
                  ? parseInt(detail.yearpublished, 10)
                  : (item.yearpublished ? parseInt(item.yearpublished, 10) : null),
                thumbnail: detail.images?.square200 || detail.images?.thumb || item.thumbnail || null,
                isInMainCollection: mainCollectionIds.has(item.objectid),
                isExpansion: detail.subtype === "boardgameexpansion" || item.subtype === "boardgameexpansion",
              };
            }
          }
        } catch {
          // Ignore errors, return basic info
        }

        // Return basic info if detail fetch fails
        return {
          id: item.objectid,
          name: item.name,
          yearPublished: item.yearpublished ? parseInt(item.yearpublished, 10) : null,
          thumbnail: item.thumbnail || null,
          isInMainCollection: mainCollectionIds.has(item.objectid),
          isExpansion: item.subtype === "boardgameexpansion",
        };
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("BGG search failed:", error);
    return NextResponse.json(
      { error: "Failed to search BoardGameGeek" },
      { status: 500 }
    );
  }
}
