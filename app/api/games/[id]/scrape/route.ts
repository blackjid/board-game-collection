import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { enqueueScrape } from "@/lib/scrape-queue";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/games/[id]/scrape
 * Queue a single game for scraping (fire-and-forget)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Queue the scrape job (non-blocking)
  const job = await enqueueScrape(id, game.name);

  return NextResponse.json({
    success: true,
    message: "Scrape job queued",
    job: {
      id: job.id,
      gameId: job.gameId,
      gameName: job.gameName,
      status: job.status,
    },
  });
}
