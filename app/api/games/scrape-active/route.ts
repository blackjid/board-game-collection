import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const activeGames = await prisma.game.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  if (activeGames.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No active games to scrape",
      scraped: 0,
    });
  }

  const results: { id: string; name: string; success: boolean; error?: string }[] = [];

  for (const game of activeGames) {
    try {
      // Call the individual scrape endpoint internally
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/games/${game.id}/scrape`,
        { method: "POST" }
      );

      if (response.ok) {
        results.push({ id: game.id, name: game.name, success: true });
      } else {
        const error = await response.text();
        results.push({ id: game.id, name: game.name, success: false, error });
      }

      // Small delay between scrapes to be nice to BGG
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      results.push({ id: game.id, name: game.name, success: false, error: String(error) });
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    success: true,
    message: `Scraped ${successful} games, ${failed} failed`,
    scraped: successful,
    failed,
    results,
  });
}
