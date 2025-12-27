import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface Params {
  params: Promise<{ code: string }>;
}

interface VoteBody {
  playerId: string;
  gameId: string;
  decision: "like" | "skip" | "pick";
  progress: number;
}

/**
 * POST /api/pick/sessions/[code]/vote
 * Submit a vote (swipe) for a game
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { code } = await params;
    const body: VoteBody = await request.json();
    const { playerId, gameId, decision, progress } = body;

    if (!playerId || !gameId || !decision) {
      return NextResponse.json(
        { error: "Missing required fields: playerId, gameId, decision" },
        { status: 400 }
      );
    }

    const session = await prisma.pickSession.findUnique({
      where: { code: code.toUpperCase() },
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

    // Upsert the vote (allow changing decision)
    await prisma.pickSessionVote.upsert({
      where: {
        sessionId_playerId_gameId: {
          sessionId: session.id,
          playerId,
          gameId,
        },
      },
      create: {
        sessionId: session.id,
        playerId,
        gameId,
        decision,
      },
      update: {
        decision,
      },
    });

    // Update player progress
    await prisma.pickSessionPlayer.update({
      where: { id: playerId },
      data: { progress },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error submitting vote:", error);
    return NextResponse.json(
      { error: "Failed to submit vote" },
      { status: 500 }
    );
  }
}
