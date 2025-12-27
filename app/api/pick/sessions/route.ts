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
  filters: {
    players: number | null;
    kidsPlaying: boolean | null;
    time: "quick" | "medium" | "long" | "epic" | null;
    categories: string[];
    includeExpansions: boolean;
  };
  gameIds: string[];
}

/**
 * POST /api/pick/sessions
 * Create a new collaborative pick session
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateSessionBody = await request.json();
    const { hostName, filters, gameIds } = body;

    if (!hostName || !gameIds || gameIds.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: hostName, gameIds" },
        { status: 400 }
      );
    }

    const code = await getUniqueSessionCode();

    // Create the session
    const session = await prisma.pickSession.create({
      data: {
        code,
        hostName,
        status: "active",
        filtersJson: JSON.stringify(filters),
        gameIdsJson: JSON.stringify(gameIds),
      },
    });

    // Create the host as the first player
    const hostPlayer = await prisma.pickSessionPlayer.create({
      data: {
        sessionId: session.id,
        name: hostName,
        isHost: true,
        status: "picking",
        progress: 0,
      },
    });

    return NextResponse.json({
      session: {
        id: session.id,
        code: session.code,
        hostName: session.hostName,
        status: session.status,
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
