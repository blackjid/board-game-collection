import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import prisma from "@/lib/prisma";

const DEFAULT_BGG_USERNAME = "jidonoso";

async function getBggUsername(): Promise<string> {
  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
  });
  return settings?.bggUsername || DEFAULT_BGG_USERNAME;
}

interface ScrapedGame {
  id: string;
  name: string;
  yearPublished: number | null;
  isExpansion: boolean;
}

async function scrapeCollection(username: string): Promise<ScrapedGame[]> {
  const collectionUrl = `https://boardgamegeek.com/collection/user/${username}?own=1&subtype=boardgame&ff=1`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(collectionUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("table", { timeout: 30000 });

  const games = await page.evaluate(() => {
    const rows = document.querySelectorAll("table tbody tr");
    const gameList: ScrapedGame[] = [];

    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 5) return;

      const nameCell = cells[0];
      const link = nameCell.querySelector("a");
      if (!link) return;

      const name = link.textContent?.trim() || "";
      const href = link.getAttribute("href") || "";

      // Skip invalid entries
      if (!name || name.includes("»") || name.includes("Filters") || name.length < 2) {
        return;
      }

      // Extract game ID from href
      const idMatch = href.match(/\/(?:boardgame|boardgameexpansion)\/(\d+)/);
      const id = idMatch ? idMatch[1] : "";
      if (!id) return;

      // Check if it's an expansion
      const isExpansion = href.includes("boardgameexpansion");

      // Extract year
      const cellText = nameCell.textContent || "";
      const yearMatch = cellText.match(/\((\d{4})\)/);
      const yearPublished = yearMatch ? parseInt(yearMatch[1]) : null;

      gameList.push({ id, name, yearPublished, isExpansion });
    });

    return gameList;
  });

  await browser.close();
  return games;
}

export async function POST(request: NextRequest) {
  try {
    const bggUsername = await getBggUsername();
    console.log(`Starting collection import for user: ${bggUsername}...`);

    const games = await scrapeCollection(bggUsername);
    console.log(`Found ${games.length} games in collection`);

    // Upsert all games - only update basic info, preserve existing scraped data
    let created = 0;
    let updated = 0;

    for (const game of games) {
      const existing = await prisma.game.findUnique({ where: { id: game.id } });

      if (existing) {
        // Update only if name or year changed
        if (existing.name !== game.name || existing.yearPublished !== game.yearPublished) {
          await prisma.game.update({
            where: { id: game.id },
            data: {
              name: game.name,
              yearPublished: game.yearPublished,
              isExpansion: game.isExpansion,
            },
          });
          updated++;
        }
      } else {
        await prisma.game.create({
          data: {
            id: game.id,
            name: game.name,
            yearPublished: game.yearPublished,
            isExpansion: game.isExpansion,
          },
        });
        created++;
      }
    }

    // Log the sync
    await prisma.syncLog.create({
      data: {
        username: bggUsername,
        gamesFound: games.length,
        status: "success",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Import complete: ${created} new games, ${updated} updated`,
      total: games.length,
      created,
      updated,
    });
  } catch (error) {
    console.error("Import failed:", error);

    // Log the failed sync
    const failedUsername = await getBggUsername();
    await prisma.syncLog.create({
      data: {
        username: failedUsername,
        gamesFound: 0,
        status: "failed",
      },
    });

    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return the last sync status
  const lastSync = await prisma.syncLog.findFirst({
    orderBy: { syncedAt: "desc" },
  });

  const totalGames = await prisma.game.count();
  const activeGames = await prisma.game.count({ where: { isActive: true } });
  const scrapedGames = await prisma.game.count({ where: { lastScraped: { not: null } } });

  const bggUsername = await getBggUsername();

  return NextResponse.json({
    lastSync,
    bggUsername,
    stats: {
      total: totalGames,
      active: activeGames,
      scraped: scrapedGames,
    },
  });
}
