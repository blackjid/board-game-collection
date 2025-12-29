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

  // Check for skipAutoScrape in request body
  let skipAutoScrape = false;
  try {
    const body = await request.json();
    skipAutoScrape = body.skipAutoScrape === true;
  } catch {
    // No body or invalid JSON - use default (don't skip)
  }

  const result = await performSyncWithAutoScrape(skipAutoScrape);

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
  const activeGames = await prisma.game.count({ where: { isVisible: true } });
  const scrapedGames = await prisma.game.count({ where: { lastScraped: { not: null } } });
  const unscrapedActiveGames = await prisma.game.count({
    where: { isVisible: true, lastScraped: null },
  });

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
