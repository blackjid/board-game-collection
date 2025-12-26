import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { scrapeGame } from "@/lib/sync";

interface RouteParams {
  params: Promise<{ id: string }>;
}

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

  const success = await scrapeGame(id);

  if (!success) {
    return NextResponse.json(
      { success: false, error: "Scrape failed" },
      { status: 500 }
    );
  }

  // Fetch the updated game
  const updatedGame = await prisma.game.findUnique({ where: { id } });

  return NextResponse.json({
    success: true,
    game: updatedGame,
  });
}
