import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const activeOnly = searchParams.get("active") === "true";
  const scrapedOnly = searchParams.get("scraped") === "true";

  const where: Record<string, unknown> = {};

  if (activeOnly) {
    where.isActive = true;
  }

  if (scrapedOnly) {
    where.lastScraped = { not: null };
  }

  const games = await prisma.game.findMany({
    where,
    orderBy: { name: "asc" },
  });

  // Parse JSON fields for response
  const parsedGames = games.map((game) => ({
    ...game,
    categories: game.categories ? JSON.parse(game.categories) : [],
    mechanics: game.mechanics ? JSON.parse(game.mechanics) : [],
    availableImages: game.availableImages ? JSON.parse(game.availableImages) : [],
    componentImages: game.componentImages ? JSON.parse(game.componentImages) : [],
  }));

  return NextResponse.json({ games: parsedGames });
}
