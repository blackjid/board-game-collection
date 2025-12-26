import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { syncCollection, getBggUsername } from "@/lib/sync";

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await syncCollection();

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Import complete: ${result.created} new games, ${result.updated} updated`,
    total: result.total,
    created: result.created,
    updated: result.updated,
  });
}

export async function GET() {
  // Return the last sync status
  const lastSync = await prisma.syncLog.findFirst({
    orderBy: { syncedAt: "desc" },
  });

  const totalGames = await prisma.game.count();
  const activeGames = await prisma.game.count({ where: { isActive: true } });
  const scrapedGames = await prisma.game.count({ where: { lastScraped: { not: null } } });
  const unscrapedActiveGames = await prisma.game.count({
    where: { isActive: true, lastScraped: null },
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
