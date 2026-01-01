import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { enqueueScrapeMany, getQueueStatus } from "@/lib/scrape-queue";

/**
 * POST /api/games/scrape-active
 * Queue all games in any collection for scraping (fire-and-forget)
 */
export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get all games that are in at least one collection
  const collectionGames = await prisma.collectionGame.findMany({
    include: {
      game: {
        select: { id: true, name: true },
      },
    },
    distinct: ["gameId"],
  });

  const activeGames = collectionGames.map((cg) => cg.game);

  if (activeGames.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No active games to scrape",
      queued: 0,
    });
  }

  // Queue all games (non-blocking)
  const jobs = await enqueueScrapeMany(activeGames.map(g => ({ id: g.id, name: g.name })));
  const status = await getQueueStatus();

  return NextResponse.json({
    success: true,
    message: `Queued ${jobs.length} games for scraping`,
    queued: jobs.length,
    queueStatus: {
      isProcessing: status.isProcessing,
      pendingCount: status.pendingCount,
    },
  });
}
