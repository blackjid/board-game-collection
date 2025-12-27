import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface Params {
  params: Promise<{ code: string }>;
}

interface EndSessionBody {
  playerId: string;
}

/**
 * POST /api/pick/sessions/[code]/end
 * End the session (host only)
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { code } = await params;
    const body: EndSessionBody = await request.json();
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

    // Verify the player is the host
    const player = session.players.find((p) => p.id === playerId);
    if (!player?.isHost) {
      return NextResponse.json(
        { error: "Only the host can end the session" },
        { status: 403 }
      );
    }

    // Update session status
    await prisma.pickSession.update({
      where: { id: session.id },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error ending session:", error);
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 }
    );
  }
}
