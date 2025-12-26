import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const game = await prisma.game.findUnique({
    where: { id },
    select: {
      id: true,
      selectedThumbnail: true,
      componentImages: true,
      availableImages: true,
      image: true,
    },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  return NextResponse.json({
    gameId: game.id,
    selectedThumbnail: game.selectedThumbnail,
    componentImages: game.componentImages ? JSON.parse(game.componentImages) : [],
    availableImages: game.availableImages ? JSON.parse(game.availableImages) : [],
    defaultImage: game.image,
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};

  // Update selected thumbnail
  if (body.selectedThumbnail !== undefined) {
    updateData.selectedThumbnail = body.selectedThumbnail;
  }

  // Update component images (array of URLs)
  if (body.componentImages !== undefined) {
    updateData.componentImages = JSON.stringify(body.componentImages);
  }

  const updatedGame = await prisma.game.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({
    success: true,
    gameId: updatedGame.id,
    selectedThumbnail: updatedGame.selectedThumbnail,
    componentImages: updatedGame.componentImages ? JSON.parse(updatedGame.componentImages) : [],
  });
}
