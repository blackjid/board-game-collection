import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { enqueueScrapeMany, getQueueStatus } from "@/lib/scrape-queue";

/**
 * POST /api/games/scrape-active
 * Queue all active games for scraping (fire-and-forget)
 */
export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const activeGames = await prisma.game.findMany({
    where: { isVisible: true },
    select: { id: true, name: true },
  });

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
