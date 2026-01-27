import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { enqueueScrape } from "@/lib/scrape-queue";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const activeOnly = searchParams.get("active") === "true";
  const scrapedOnly = searchParams.get("scraped") === "true";

  // Get the primary collection ID to determine "active" status
  const primaryCollection = await prisma.collection.findFirst({
    where: { isPrimary: true },
    select: { id: true },
  });
  const primaryCollectionId = primaryCollection?.id;

  // Get all games in the primary collection
  const primaryCollectionGames = primaryCollectionId
    ? await prisma.collectionGame.findMany({
        where: { collectionId: primaryCollectionId },
        select: { gameId: true },
      })
    : [];
  const primaryGameIds = new Set(primaryCollectionGames.map((cg) => cg.gameId));

  let games;

  if (activeOnly) {
    // Get games that are in the primary collection
    if (!primaryCollectionId) {
      return NextResponse.json({ games: [] });
    }

    // First get game IDs in the primary collection
    const collectionGameIds = await prisma.collectionGame.findMany({
      where: {
        collectionId: primaryCollectionId,
      },
      select: { gameId: true },
    });
    const gameIds = collectionGameIds.map((cg) => cg.gameId);

    // Then query games
    games = await prisma.game.findMany({
      where: {
        id: { in: gameIds },
        ...(scrapedOnly ? { lastScraped: { not: null } } : {}),
      },
      orderBy: { name: "asc" },
    });
  } else {
    const where: Prisma.GameWhereInput = {};
    if (scrapedOnly) {
      where.lastScraped = { not: null };
    }
    games = await prisma.game.findMany({
      where,
      orderBy: { name: "asc" },
    });
  }

  // Fetch "expands" relationships for expansion games
  const expansionGameIds = games.filter(g => g.isExpansion).map(g => g.id);
  const expandsRelations = expansionGameIds.length > 0
    ? await prisma.gameRelationship.findMany({
        where: {
          fromGameId: { in: expansionGameIds },
          type: "expands",
        },
        include: {
          toGame: {
            select: { id: true, name: true, thumbnail: true, selectedThumbnail: true, image: true },
          },
        },
      })
    : [];

  // Build a map of gameId -> array of base games it expands
  const expandsGamesMap = new Map<string, typeof expandsRelations[number]["toGame"][]>();
  for (const relation of expandsRelations) {
    if (!expandsGamesMap.has(relation.fromGameId)) {
      expandsGamesMap.set(relation.fromGameId, []);
    }
    expandsGamesMap.get(relation.fromGameId)!.push(relation.toGame);
  }

  // Parse JSON fields for response
  const parsedGames = games.map((game) => {
    // Get base games from map if this is an expansion
    const baseGamesData = expandsGamesMap.get(game.id) || [];
    const expandsGames = baseGamesData.map(bg => ({
      id: bg.id,
      name: bg.name,
      thumbnail: bg.selectedThumbnail || bg.thumbnail || bg.image,
      inCollection: primaryGameIds.has(bg.id),
    }));

    return {
      ...game,
      isActive: primaryGameIds.has(game.id), // Active if in primary collection
      categories: game.categories ? JSON.parse(game.categories) : [],
      mechanics: game.mechanics ? JSON.parse(game.mechanics) : [],
      availableImages: game.availableImages ? JSON.parse(game.availableImages) : [],
      componentImages: game.componentImages ? JSON.parse(game.componentImages) : [],
      expandsGames,
      requiredGames: [], // TODO: Populate when "requires" relationships are scraped
      expansions: [],
      requiredBy: [],
    };
  });

  return NextResponse.json({ games: parsedGames });
}

/**
 * POST /api/games
 * Create a game if it doesn't exist (for BGG search results)
 * Body: { gameId, name, yearPublished?, isExpansion? }
 * Returns: { game, wasCreated, queuedForScraping }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, name, yearPublished, isExpansion } = body;

    // Validation
    if (!gameId) {
      return NextResponse.json(
        { error: "gameId is required" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    // Check if game already exists
    let game = await prisma.game.findUnique({ where: { id: gameId } });
    let wasCreated = false;

    if (!game) {
      // Create the game
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

    return NextResponse.json({
      game: {
        id: game.id,
        name: game.name,
        yearPublished: game.yearPublished,
        thumbnail: game.selectedThumbnail || game.thumbnail || game.image,
        isExpansion: game.isExpansion,
        lastScraped: game.lastScraped,
      },
      wasCreated,
      queuedForScraping: wasCreated,
    });
  } catch (error) {
    console.error("Failed to create game:", error);
    return NextResponse.json(
      { error: "Failed to create game" },
      { status: 500 }
    );
  }
}
