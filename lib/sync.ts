import { chromium } from "playwright";
import prisma from "@/lib/prisma";

const DEFAULT_BGG_USERNAME = "jidonoso";

// ============================================================================
// Types
// ============================================================================

interface ScrapedGame {
  id: string;
  name: string;
  yearPublished: number | null;
  isExpansion: boolean;
}

export interface SyncResult {
  success: boolean;
  total: number;
  created: number;
  updated: number;
  newGameIds: string[];
  error?: string;
}

export interface SyncWithAutoScrapeResult extends SyncResult {
  autoScraped: number;
  autoScrapeFailed: number;
}

export interface ScrapeResult {
  success: boolean;
  scraped: number;
  failed: number;
}

// ============================================================================
// Settings Helpers
// ============================================================================

export async function getBggUsername(): Promise<string> {
  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
  });
  return settings?.bggUsername || DEFAULT_BGG_USERNAME;
}

export async function getSettings() {
  let settings = await prisma.settings.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    settings = await prisma.settings.create({
      data: { id: "default" },
    });
  }

  return settings;
}

// ============================================================================
// Collection Scraping (from BGG)
// ============================================================================

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

// ============================================================================
// Sync Collection (Main Import Function)
// ============================================================================

export async function syncCollection(): Promise<SyncResult> {
  const bggUsername = await getBggUsername();
  console.log(`[Sync] Starting collection import for user: ${bggUsername}...`);

  try {
    const games = await scrapeCollection(bggUsername);
    console.log(`[Sync] Found ${games.length} games in collection`);

    // Upsert all games - only update basic info, preserve existing scraped data
    let created = 0;
    let updated = 0;
    const newGameIds: string[] = [];

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
        newGameIds.push(game.id);
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

    console.log(`[Sync] Import complete: ${created} new games, ${updated} updated`);

    return {
      success: true,
      total: games.length,
      created,
      updated,
      newGameIds,
    };
  } catch (error) {
    console.error("[Sync] Import failed:", error);

    // Log the failed sync
    await prisma.syncLog.create({
      data: {
        username: bggUsername,
        gamesFound: 0,
        status: "failed",
      },
    });

    return {
      success: false,
      total: 0,
      created: 0,
      updated: 0,
      newGameIds: [],
      error: String(error),
    };
  }
}

// ============================================================================
// Sync with Auto-Scrape (Used by both manual and scheduled sync)
// ============================================================================

export async function performSyncWithAutoScrape(
  skipAutoScrape: boolean = false
): Promise<SyncWithAutoScrapeResult> {
  const settings = await getSettings();

  // Run the sync
  const result = await syncCollection();

  // Initialize auto-scrape counters
  let autoScraped = 0;
  let autoScrapeFailed = 0;

  // Auto-scrape new games if enabled and not skipped
  if (
    result.success &&
    settings.autoScrapeNewGames &&
    !skipAutoScrape &&
    result.newGameIds.length > 0
  ) {
    console.log(`[Sync] Auto-scraping ${result.newGameIds.length} new games...`);

    // First, mark new games as active
    await prisma.game.updateMany({
      where: { id: { in: result.newGameIds } },
      data: { isActive: true },
    });

    // Scrape the new games
    const scrapeResult = await scrapeGames(result.newGameIds);
    autoScraped = scrapeResult.scraped;
    autoScrapeFailed = scrapeResult.failed;
  }

  return {
    ...result,
    autoScraped,
    autoScrapeFailed,
  };
}

// ============================================================================
// Game Scraping (Fetch Details from BGG)
// ============================================================================

// Strip HTML tags from text
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Fetch gallery images from BGG's internal API
async function fetchGalleryImagesFromAPI(gameId: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://api.geekdo.com/api/images?ajax=1&foritempage=1&galleries[]=game&nosession=1&objectid=${gameId}&objecttype=thing&showcount=20&size=original&sort=hot`
    );
    const data = await response.json();
    const images = data.images || [];

    return images
      .map((img: { imageurl_lg?: string; imageurl?: string }) => img.imageurl_lg || img.imageurl)
      .filter((url: string) => url && url.includes("geekdo-images"));
  } catch (e) {
    console.log(`[Scrape] Images API error for ${gameId}: ${e}`);
    return [];
  }
}

// Fetch extended game data from BGG's internal JSON API
async function fetchExtendedDataFromAPI(gameId: string) {
  const result = {
    rating: null as number | null,
    description: null as string | null,
    minAge: null as number | null,
    categories: [] as string[],
    mechanics: [] as string[],
    isExpansion: false,
    minPlayers: null as number | null,
    maxPlayers: null as number | null,
    minPlaytime: null as number | null,
    maxPlaytime: null as number | null,
  };

  try {
    const response = await fetch(`https://api.geekdo.com/api/geekitems?objecttype=thing&objectid=${gameId}`);
    const data = await response.json();
    const item = data.item;

    if (!item) return result;

    result.isExpansion = item.subtype === "boardgameexpansion";

    if (item.short_description) {
      result.description = item.short_description;
    } else if (item.description) {
      let desc = stripHtml(item.description);
      if (desc.length > 500) {
        desc = desc.substring(0, 500).replace(/\s+\S*$/, "") + "...";
      }
      result.description = desc;
    }

    if (item.minplayers) result.minPlayers = parseInt(item.minplayers, 10);
    if (item.maxplayers) result.maxPlayers = parseInt(item.maxplayers, 10);
    if (item.minplaytime) result.minPlaytime = parseInt(item.minplaytime, 10);
    if (item.maxplaytime) result.maxPlaytime = parseInt(item.maxplaytime, 10);
    if (item.minage) result.minAge = parseInt(item.minage, 10);

    const categories = item.links?.boardgamecategory || [];
    result.categories = categories.map((c: { name: string }) => c.name);

    const mechanics = item.links?.boardgamemechanic || [];
    result.mechanics = mechanics.map((m: { name: string }) => m.name);
  } catch (e) {
    console.log(`[Scrape] API fetch error for ${gameId}: ${e}`);
  }

  return result;
}

// Scrape main image and rating from game page
async function scrapeGamePage(gameId: string, isExpansion: boolean) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let image = "";
  let rating: number | null = null;

  try {
    const url = isExpansion
      ? `https://boardgamegeek.com/boardgameexpansion/${gameId}`
      : `https://boardgamegeek.com/boardgame/${gameId}`;

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    const result = await page.evaluate(() => {
      // Get the main game image
      const imgEl = document.querySelector('img[src*="cf.geekdo-images"][src*="itemrep"]') ||
                   document.querySelector('img[src*="cf.geekdo-images"]:not([src*="avatar"])');
      const image = imgEl?.getAttribute("src") || "";

      // Get BGG rating from JSON-LD
      let bggRating: number | null = null;
      const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
      if (jsonLdScript) {
        try {
          const jsonData = JSON.parse(jsonLdScript.textContent || "");
          if (jsonData.aggregateRating?.ratingValue) {
            bggRating = Math.round(parseFloat(jsonData.aggregateRating.ratingValue) * 10) / 10;
          }
        } catch {
          // Ignore JSON parse errors
        }
      }

      return { image, bggRating };
    });

    image = result.image;
    rating = result.bggRating;
  } catch (e) {
    console.log(`[Scrape] Scrape error for ${gameId}: ${e}`);
  } finally {
    await browser.close();
  }

  return { image, rating };
}

// Scrape a single game
export async function scrapeGame(gameId: string): Promise<boolean> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) {
    console.log(`[Scrape] Game not found: ${gameId}`);
    return false;
  }

  console.log(`[Scrape] Scraping game: ${game.name} (${gameId})`);

  try {
    // Fetch all data in parallel
    const [pageData, extendedData, galleryImages] = await Promise.all([
      scrapeGamePage(gameId, game.isExpansion),
      fetchExtendedDataFromAPI(gameId),
      fetchGalleryImagesFromAPI(gameId),
    ]);

    // Update the game with scraped data
    await prisma.game.update({
      where: { id: gameId },
      data: {
        image: pageData.image || null,
        thumbnail: pageData.image || null,
        rating: pageData.rating ?? extendedData.rating,
        description: extendedData.description,
        minPlayers: extendedData.minPlayers,
        maxPlayers: extendedData.maxPlayers,
        minPlaytime: extendedData.minPlaytime,
        maxPlaytime: extendedData.maxPlaytime,
        minAge: extendedData.minAge,
        categories: JSON.stringify(extendedData.categories),
        mechanics: JSON.stringify(extendedData.mechanics),
        isExpansion: extendedData.isExpansion,
        availableImages: JSON.stringify(galleryImages),
        lastScraped: new Date(),
      },
    });

    return true;
  } catch (error) {
    console.error(`[Scrape] Failed for ${gameId}:`, error);
    return false;
  }
}

// Scrape multiple games
export async function scrapeGames(gameIds: string[]): Promise<ScrapeResult> {
  let scraped = 0;
  let failed = 0;

  for (const gameId of gameIds) {
    const success = await scrapeGame(gameId);
    if (success) {
      scraped++;
    } else {
      failed++;
    }

    // Small delay between scrapes to be nice to BGG
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`[Scrape] Completed: ${scraped} scraped, ${failed} failed`);

  return { success: true, scraped, failed };
}

// ============================================================================
// Scheduled Sync Logic
// ============================================================================

export async function isSyncDue(): Promise<boolean> {
  const settings = await getSettings();

  if (settings.syncSchedule === "manual") {
    return false;
  }

  if (!settings.lastScheduledSync) {
    // Never synced before, sync now
    return true;
  }

  const now = new Date();
  const lastSync = new Date(settings.lastScheduledSync);
  const diffMs = now.getTime() - lastSync.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  switch (settings.syncSchedule) {
    case "daily":
      return diffHours >= 24;
    case "weekly":
      return diffDays >= 7;
    case "monthly":
      return diffDays >= 30;
    default:
      return false;
  }
}

export async function runScheduledSync(): Promise<void> {
  console.log("[Scheduler] Running scheduled sync...");

  const result = await performSyncWithAutoScrape();

  if (result.success) {
    // Update last scheduled sync time
    await prisma.settings.update({
      where: { id: "default" },
      data: { lastScheduledSync: new Date() },
    });

    if (result.autoScraped > 0) {
      console.log(`[Scheduler] Auto-scraped ${result.autoScraped} new games`);
    }
  }
}
