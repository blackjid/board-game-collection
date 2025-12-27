import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface Params {
  params: Promise<{ code: string }>;
}

interface JoinSessionBody {
  playerName: string;
}

/**
 * POST /api/pick/sessions/[code]/join
 * Join an existing session as a new player
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { code } = await params;
    const body: JoinSessionBody = await request.json();
    const { playerName } = body;

    if (!playerName || playerName.trim().length === 0) {
      return NextResponse.json(
        { error: "Player name is required" },
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

    if (session.status !== "active") {
      return NextResponse.json(
        { error: "Session is no longer active" },
        { status: 400 }
      );
    }

    // Check if player name already exists in session
    const existingPlayer = session.players.find(
      (p) => p.name.toLowerCase() === playerName.trim().toLowerCase()
    );
    if (existingPlayer) {
      // Return existing player instead of creating a new one
      return NextResponse.json({
        player: {
          id: existingPlayer.id,
          name: existingPlayer.name,
          isHost: existingPlayer.isHost,
          status: existingPlayer.status,
          progress: existingPlayer.progress,
        },
        session: {
          code: session.code,
          hostName: session.hostName,
          status: session.status,
        },
        isRejoining: true,
      });
    }

    // Create new player
    const player = await prisma.pickSessionPlayer.create({
      data: {
        sessionId: session.id,
        name: playerName.trim(),
        isHost: false,
        status: "picking",
        progress: 0,
      },
    });

    return NextResponse.json({
      player: {
        id: player.id,
        name: player.name,
        isHost: player.isHost,
        status: player.status,
        progress: player.progress,
      },
      session: {
        code: session.code,
        hostName: session.hostName,
        status: session.status,
      },
      isRejoining: false,
    });
  } catch (error) {
    console.error("Error joining session:", error);
    return NextResponse.json(
      { error: "Failed to join session" },
      { status: 500 }
    );
  }
}
