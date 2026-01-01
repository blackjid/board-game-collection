import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

interface SessionWithDetails {
  id: string;
  code: string;
  type: string;
  hostName: string;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
  winnerGameId: string | null;
  winnerGame: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  playerCount: number;
  gameCount: number;
  voteCount: number;
}

/**
 * GET /api/pick/sessions/admin
 * List all pick sessions (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type"); // "solo" | "collaborative" | null (all)
    const status = searchParams.get("status"); // "active" | "completed" | "cancelled" | null (all)
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build where clause
    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;

    // Get total count for pagination
    const totalCount = await prisma.pickSession.count({ where });

    // Fetch sessions with related data
    const sessions = await prisma.pickSession.findMany({
      where,
      include: {
        players: { select: { id: true } },
        votes: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    // Get winner game details for sessions with winners
    const winnerGameIds = sessions
      .filter((s) => s.winnerGameId)
      .map((s) => s.winnerGameId as string);

    const winnerGames = await prisma.game.findMany({
      where: { id: { in: winnerGameIds } },
      select: {
        id: true,
        name: true,
        selectedThumbnail: true,
        image: true,
        thumbnail: true,
      },
    });

    const gameMap = new Map(
      winnerGames.map((g) => [
        g.id,
        {
          id: g.id,
          name: g.name,
          image: g.selectedThumbnail || g.image || g.thumbnail,
        },
      ])
    );

    // Transform to response format
    const sessionList: SessionWithDetails[] = sessions.map((session) => {
      const gameIds: string[] = JSON.parse(session.gameIdsJson);
      return {
        id: session.id,
        code: session.code,
        type: session.type,
        hostName: session.hostName,
        status: session.status,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
        winnerGameId: session.winnerGameId,
        winnerGame: session.winnerGameId
          ? gameMap.get(session.winnerGameId) || null
          : null,
        playerCount: session.players.length,
        gameCount: gameIds.length,
        voteCount: session.votes.length,
      };
    });

    return NextResponse.json({
      sessions: sessionList,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + sessions.length < totalCount,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    console.error("Error listing sessions:", error);
    return NextResponse.json(
      { error: "Failed to list sessions" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pick/sessions/admin
 * Delete one or more sessions (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { sessionIds } = body as { sessionIds: string[] };

    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid sessionIds array" },
        { status: 400 }
      );
    }

    // Delete sessions (cascades to players and votes)
    const result = await prisma.pickSession.deleteMany({
      where: { id: { in: sessionIds } },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    console.error("Error deleting sessions:", error);
    return NextResponse.json(
      { error: "Failed to delete sessions" },
      { status: 500 }
    );
  }
}
