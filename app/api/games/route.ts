import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

    const collectionGames = await prisma.collectionGame.findMany({
      include: {
        game: true,
      },
      where: {
        collectionId: primaryCollectionId,
        ...(scrapedOnly ? { game: { lastScraped: { not: null } } } : {}),
      },
    });

    games = collectionGames.map((cg) => cg.game).sort((a, b) => a.name.localeCompare(b.name));
  } else {
    const where: Record<string, unknown> = {};
    if (scrapedOnly) {
      where.lastScraped = { not: null };
    }
    games = await prisma.game.findMany({
      where,
      orderBy: { name: "asc" },
    });
  }

  // Parse JSON fields for response
  const parsedGames = games.map((game) => ({
    ...game,
    isActive: primaryGameIds.has(game.id), // Active if in primary collection
    categories: game.categories ? JSON.parse(game.categories) : [],
    mechanics: game.mechanics ? JSON.parse(game.mechanics) : [],
    availableImages: game.availableImages ? JSON.parse(game.availableImages) : [],
    componentImages: game.componentImages ? JSON.parse(game.componentImages) : [],
  }));

  return NextResponse.json({ games: parsedGames });
}
