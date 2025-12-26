import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { scrapeGames } from "@/lib/sync";

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const activeGames = await prisma.game.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  if (activeGames.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No active games to scrape",
      scraped: 0,
    });
  }

  const gameIds = activeGames.map((g) => g.id);
  const result = await scrapeGames(gameIds);

  return NextResponse.json({
    success: true,
    message: `Scraped ${result.scraped} games, ${result.failed} failed`,
    scraped: result.scraped,
    failed: result.failed,
  });
}
