import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const SETTINGS_ID = "default";

export async function GET() {
  let settings = await prisma.settings.findUnique({
    where: { id: SETTINGS_ID },
  });

  // Create default settings if not exists
  if (!settings) {
    settings = await prisma.settings.create({
      data: { id: SETTINGS_ID },
    });
  }

  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { collectionName, bggUsername, syncSchedule, autoScrapeNewGames } = body;

  // Check if BGG username is being changed
  if (bggUsername !== undefined) {
    const currentSettings = await prisma.settings.findUnique({
      where: { id: SETTINGS_ID },
    });

    // If username is changing from one value to a different value, clear the games database
    if (
      currentSettings?.bggUsername &&
      bggUsername !== currentSettings.bggUsername
    ) {
      console.log(
        `[Settings] BGG username changing from "${currentSettings.bggUsername}" to "${bggUsername}". Clearing games database.`
      );

      // Delete all games and sync logs
      await prisma.game.deleteMany({});
      await prisma.syncLog.deleteMany({});
    }
  }

  const settings = await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    update: {
      ...(collectionName !== undefined && { collectionName }),
      ...(bggUsername !== undefined && { bggUsername }),
      ...(syncSchedule !== undefined && { syncSchedule }),
      ...(autoScrapeNewGames !== undefined && { autoScrapeNewGames }),
    },
    create: {
      id: SETTINGS_ID,
      collectionName,
      bggUsername,
      syncSchedule: syncSchedule || "manual",
      autoScrapeNewGames: autoScrapeNewGames || false,
    },
  });

  return NextResponse.json(settings);
}
