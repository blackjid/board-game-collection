import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { performSyncWithAutoScrape, getBggUsername } from "@/lib/sync";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check for skipAutoScrape and collectionId in request body
  let skipAutoScrape = false;
  let collectionId: string | undefined;
  try {
    const body = await request.json();
    skipAutoScrape = body.skipAutoScrape === true;
    collectionId = body.collectionId;
  } catch {
    // No body or invalid JSON - use defaults
  }

  const result = await performSyncWithAutoScrape(collectionId, skipAutoScrape);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Sync complete: ${result.created} new games, ${result.updated} updated`,
    total: result.total,
    created: result.created,
    updated: result.updated,
    autoScraped: result.autoScraped,
    autoScrapeFailed: result.autoScrapeFailed,
  });
}

export async function GET() {
  // Return the last sync status
  const lastSync = await prisma.syncLog.findFirst({
    orderBy: { syncedAt: "desc" },
  });

  const totalGames = await prisma.game.count();

  // Count games in collections (active games)
  const activeGameIds = await prisma.collectionGame.findMany({
    select: { gameId: true },
    distinct: ["gameId"],
  });
  const activeGames = activeGameIds.length;

  const scrapedGames = await prisma.game.count({ where: { lastScraped: { not: null } } });

  // Unscraped active games
  const unscrapedActiveGameIds = await prisma.collectionGame.findMany({
    where: {
      game: { lastScraped: null },
    },
    select: { gameId: true },
    distinct: ["gameId"],
  });
  const unscrapedActiveGames = unscrapedActiveGameIds.length;

  const bggUsername = await getBggUsername();

  return NextResponse.json({
    lastSync,
    bggUsername,
    stats: {
      total: totalGames,
      active: activeGames,
      scraped: scrapedGames,
      unscrapedActive: unscrapedActiveGames,
    },
  });
}
