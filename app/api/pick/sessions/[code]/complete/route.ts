import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface Params {
  params: Promise<{ code: string }>;
}

interface CompleteBody {
  playerId: string;
}

/**
 * POST /api/pick/sessions/[code]/complete
 * Mark a player as done with their picks
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { code } = await params;
    const body: CompleteBody = await request.json();
    const { playerId } = body;

    if (!playerId) {
      return NextResponse.json(
        { error: "Missing required field: playerId" },
        { status: 400 }
      );
    }

    const session = await prisma.pickSession.findUnique({
      where: { code: code.toUpperCase() },
      include: { players: true },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Update player status to done
    await prisma.pickSessionPlayer.update({
      where: { id: playerId },
      data: { status: "done" },
    });

    // Check if all players are done
    const updatedPlayers = await prisma.pickSessionPlayer.findMany({
      where: { sessionId: session.id },
    });

    const allDone = updatedPlayers.every((p) => p.status === "done");

    return NextResponse.json({
      success: true,
      allPlayersDone: allDone,
      players: updatedPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        status: p.status,
        progress: p.progress,
      })),
    });
  } catch (error) {
    console.error("Error completing player:", error);
    return NextResponse.json(
      { error: "Failed to mark player as complete" },
      { status: 500 }
    );
  }
}
