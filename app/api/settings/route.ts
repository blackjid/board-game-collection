import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const SETTINGS_ID = "default";

export async function GET() {
  // Get settings from the primary collection for backward compatibility
  const primaryCollection = await prisma.collection.findFirst({
    where: { isPrimary: true },
  });

  // Return a settings-like object from the primary collection
  return NextResponse.json({
    id: SETTINGS_ID,
    collectionName: primaryCollection?.name || null,
    bggUsername: primaryCollection?.bggUsername || null,
    syncSchedule: primaryCollection?.syncSchedule || "manual",
    autoScrapeNewGames: primaryCollection?.autoScrapeNewGames || false,
    lastScheduledSync: primaryCollection?.lastSyncedAt || null,
    updatedAt: primaryCollection?.updatedAt || new Date(),
  });
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { collectionName, bggUsername, syncSchedule, autoScrapeNewGames } = body;

  // Get or create the primary collection
  let primaryCollection = await prisma.collection.findFirst({
    where: { isPrimary: true },
  });

  if (!primaryCollection) {
    primaryCollection = await prisma.collection.create({
      data: {
        name: collectionName || "My Collection",
        type: bggUsername ? "bgg_sync" : "manual",
        isPrimary: true,
        bggUsername: bggUsername || null,
        syncSchedule: syncSchedule || "manual",
        autoScrapeNewGames: autoScrapeNewGames || false,
      },
    });
  } else {
    // Check if BGG username is being changed
    if (bggUsername !== undefined && primaryCollection.bggUsername && bggUsername !== primaryCollection.bggUsername) {
      console.log(
        `[Settings] BGG username changing from "${primaryCollection.bggUsername}" to "${bggUsername}". Clearing collection games.`
      );

      // Remove all games from the primary collection
      await prisma.collectionGame.deleteMany({
        where: { collectionId: primaryCollection.id },
      });
      await prisma.syncLog.deleteMany({});
    }

    // Update the primary collection
    primaryCollection = await prisma.collection.update({
      where: { id: primaryCollection.id },
      data: {
        ...(collectionName !== undefined && { name: collectionName }),
        ...(bggUsername !== undefined && {
          bggUsername,
          type: bggUsername ? "bgg_sync" : "manual",
        }),
        ...(syncSchedule !== undefined && { syncSchedule }),
        ...(autoScrapeNewGames !== undefined && { autoScrapeNewGames }),
      },
    });
  }

  // Return a settings-like object
  return NextResponse.json({
    id: SETTINGS_ID,
    collectionName: primaryCollection.name,
    bggUsername: primaryCollection.bggUsername,
    syncSchedule: primaryCollection.syncSchedule,
    autoScrapeNewGames: primaryCollection.autoScrapeNewGames,
    lastScheduledSync: primaryCollection.lastSyncedAt,
    updatedAt: primaryCollection.updatedAt,
  });
}
