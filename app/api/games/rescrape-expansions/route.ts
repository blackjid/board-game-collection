import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { enqueueScrapeMany, getQueueStatus } from "@/lib/scrape-queue";

/**
 * POST /api/games/rescrape-expansions
 * Queue all expansion games for re-scraping to update their base game relationships.
 * This is useful to populate the GameRelationship table for existing games.
 * 
 * Options (via query params):
 * - all=true: Re-scrape all expansions regardless of whether they have relationships
 * - Default: Only re-scrape expansions that don't have any "expands" relationships
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const rescrapeAll = searchParams.get("all") === "true";

  let expansions;
  if (rescrapeAll) {
    // Re-scrape all expansions
    expansions = await prisma.game.findMany({
      where: { isExpansion: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } else {
    // Find expansions without any "expands" relationships
    const expansionsWithRelations = await prisma.gameRelationship.findMany({
      where: { type: "expands" },
      select: { fromGameId: true },
      distinct: ["fromGameId"],
    });
    const idsWithRelations = new Set(expansionsWithRelations.map(r => r.fromGameId));

    const allExpansions = await prisma.game.findMany({
      where: { isExpansion: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    expansions = allExpansions.filter(e => !idsWithRelations.has(e.id));
  }

  if (expansions.length === 0) {
    return NextResponse.json({
      success: true,
      message: rescrapeAll 
        ? "No expansion games found"
        : "All expansions already have base game relationships set",
      queued: 0,
    });
  }

  // Queue all expansions for re-scraping
  const jobs = await enqueueScrapeMany(
    expansions.map((g) => ({ id: g.id, name: g.name }))
  );
  const status = await getQueueStatus();

  return NextResponse.json({
    success: true,
    message: `Queued ${jobs.length} expansion${jobs.length !== 1 ? "s" : ""} for re-scraping`,
    queued: jobs.length,
    expansions: expansions.map((e) => ({ id: e.id, name: e.name })),
    queueStatus: {
      isProcessing: status.isProcessing,
      pendingCount: status.pendingCount,
    },
  });
}

/**
 * GET /api/games/rescrape-expansions
 * Get stats about expansions and their base game relationships
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Count total expansions
  const totalExpansions = await prisma.game.count({ where: { isExpansion: true } });

  // Count expansions that have at least one "expands" relationship
  const expansionsWithRelations = await prisma.gameRelationship.findMany({
    where: { type: "expands" },
    select: { fromGameId: true },
    distinct: ["fromGameId"],
  });
  const withBaseGame = expansionsWithRelations.length;
  const withoutBaseGame = totalExpansions - withBaseGame;

  // Get sample of expansions without any relationships
  const idsWithRelations = new Set(expansionsWithRelations.map(r => r.fromGameId));
  const sampleWithoutBaseGame = await prisma.game.findMany({
    where: { 
      isExpansion: true,
      id: { notIn: Array.from(idsWithRelations) },
    },
    select: { id: true, name: true },
    take: 10,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    totalExpansions,
    withBaseGame,
    withoutBaseGame,
    sampleWithoutBaseGame,
  });
}
