import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Generate a 6-character alphanumeric code
function generateSessionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluded similar chars like 0/O, 1/I
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Ensure unique code
async function getUniqueSessionCode(): Promise<string> {
  let code = generateSessionCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.pickSession.findUnique({ where: { code } });
    if (!existing) return code;
    code = generateSessionCode();
    attempts++;
  }
  throw new Error("Failed to generate unique session code");
}

interface CreateSessionBody {
  hostName: string;
  type?: "solo" | "collaborative";  // Defaults to "collaborative"
  filters: {
    players: number | null;
    kidsPlaying: boolean | null;
    time: "quick" | "medium" | "long" | "epic" | null;
    categories: string[];
    includeExpansions: boolean;
  };
  gameIds: string[];
  // For solo sessions that are already complete
  winnerGameId?: string;
}

/**
 * POST /api/pick/sessions
 * Create a new pick session (solo or collaborative)
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateSessionBody = await request.json();
    const { hostName, type = "collaborative", filters, gameIds, winnerGameId } = body;

    if (!hostName || !gameIds || gameIds.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: hostName, gameIds" },
        { status: 400 }
      );
    }

    const code = await getUniqueSessionCode();

    // For solo sessions with a winner already selected, mark as completed
    const isSoloComplete = type === "solo" && winnerGameId;

    // Create the session
    const session = await prisma.pickSession.create({
      data: {
        code,
        type,
        hostName,
        status: isSoloComplete ? "completed" : "active",
        filtersJson: JSON.stringify(filters),
        gameIdsJson: JSON.stringify(gameIds),
        winnerGameId: winnerGameId || null,
        completedAt: isSoloComplete ? new Date() : null,
      },
    });

    // Create the host/player as the first player
    const hostPlayer = await prisma.pickSessionPlayer.create({
      data: {
        sessionId: session.id,
        name: hostName,
        isHost: true,
        status: isSoloComplete ? "done" : "picking",
        progress: isSoloComplete ? gameIds.length : 0,
      },
    });

    return NextResponse.json({
      session: {
        id: session.id,
        code: session.code,
        type: session.type,
        hostName: session.hostName,
        status: session.status,
        winnerGameId: session.winnerGameId,
      },
      playerId: hostPlayer.id,
      totalGames: gameIds.length,
    });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pick/sessions
 * List active sessions (for debugging/admin)
 */
export async function GET() {
  try {
    const sessions = await prisma.pickSession.findMany({
      where: { status: "active" },
      include: {
        players: true,
        _count: { select: { votes: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error listing sessions:", error);
    return NextResponse.json(
      { error: "Failed to list sessions" },
      { status: 500 }
    );
  }
}
