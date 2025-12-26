import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const game = await prisma.game.findUnique({
    where: { id },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Parse JSON fields
  const parsedGame = {
    ...game,
    categories: game.categories ? JSON.parse(game.categories) : [],
    mechanics: game.mechanics ? JSON.parse(game.mechanics) : [],
    availableImages: game.availableImages ? JSON.parse(game.availableImages) : [],
    componentImages: game.componentImages ? JSON.parse(game.componentImages) : [],
  };

  return NextResponse.json({ game: parsedGame });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Only allow updating isActive via this route
  const updateData: Record<string, unknown> = {};

  if (typeof body.isActive === "boolean") {
    updateData.isActive = body.isActive;
  }

  const updatedGame = await prisma.game.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ game: updatedGame });
}
