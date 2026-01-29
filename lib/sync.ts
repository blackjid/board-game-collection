import prisma from "@/lib/prisma";
import { getBggClient } from "@/lib/bgg";

// ============================================================================
// Types
// ============================================================================

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
// Collection Helpers
// ============================================================================

/**
 * Get the primary collection (or create one if it doesn't exist)
 */
export async function getPrimaryCollection() {
  let collection = await prisma.collection.findFirst({
    where: { isPrimary: true },
  });

  if (!collection) {
    collection = await prisma.collection.create({
      data: {
        name: "My Collection",
        type: "manual",
        isPrimary: true,
      },
    });
  }

  return collection;
}

/**
 * Get the BGG username from the primary collection
 */
export async function getBggUsername(): Promise<string> {
  const collection = await getPrimaryCollection();
  return collection.bggUsername || "";
}

/**
 * Get settings from the primary collection
 * This is a compatibility layer for code that expects the old Settings model
 */
export async function getSettings() {
  const collection = await getPrimaryCollection();

  return {
    id: collection.id,
    bggUsername: collection.bggUsername,
    collectionName: collection.name,
    syncSchedule: collection.syncSchedule,
    autoScrapeNewGames: collection.autoScrapeNewGames,
    lastScheduledSync: collection.lastSyncedAt,
  };
}

// ============================================================================
// Sync Collection (Main Import Function)
// ============================================================================

/**
 * Sync a specific collection from BGG
 * @param collectionId - The collection ID to sync. If not provided, syncs the primary collection.
 */
export async function syncCollection(collectionId?: string): Promise<SyncResult> {
  // Get the collection to sync
  const collection = collectionId
    ? await prisma.collection.findUnique({ where: { id: collectionId } })
    : await getPrimaryCollection();

  if (!collection) {
    return {
      success: false,
      total: 0,
      created: 0,
      updated: 0,
      newGameIds: [],
      error: "Collection not found",
    };
  }

  if (!collection.bggUsername) {
    return {
      success: false,
      total: 0,
      created: 0,
      updated: 0,
      newGameIds: [],
      error: "No BGG username configured for this collection",
    };
  }

  const bggUsername = collection.bggUsername;
  console.log(`[Sync] Starting collection import for user: ${bggUsername}...`);

  try {
    // Use the BGG client to fetch collection
    const client = getBggClient();
    const games = await client.getCollection(bggUsername);
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

      // Ensure game is in this collection
      const existingLink = await prisma.collectionGame.findUnique({
        where: {
          collectionId_gameId: {
            collectionId: collection.id,
            gameId: game.id,
          },
        },
      });

      if (!existingLink) {
        await prisma.collectionGame.create({
          data: {
            collectionId: collection.id,
            gameId: game.id,
            addedBy: "sync",
          },
        });
      }
    }

    // Update collection's lastSyncedAt
    await prisma.collection.update({
      where: { id: collection.id },
      data: { lastSyncedAt: new Date() },
    });

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
  collectionId?: string,
  skipAutoScrape: boolean = false
): Promise<SyncWithAutoScrapeResult> {
  // Import queue here to avoid circular dependency
  const { enqueueScrapeMany } = await import("./scrape-queue");

  // Get the collection to sync
  const collection = collectionId
    ? await prisma.collection.findUnique({ where: { id: collectionId } })
    : await getPrimaryCollection();

  if (!collection) {
    return {
      success: false,
      total: 0,
      created: 0,
      updated: 0,
      newGameIds: [],
      autoScraped: 0,
      autoScrapeFailed: 0,
      error: "Collection not found",
    };
  }

  // Run the sync
  const result = await syncCollection(collection.id);

  // Count of games queued for auto-scrape
  let autoScraped = 0;
  const autoScrapeFailed = 0;

  // Auto-scrape new games if enabled and not skipped
  if (
    result.success &&
    collection.autoScrapeNewGames &&
    !skipAutoScrape &&
    result.newGameIds.length > 0
  ) {
    console.log(`[Sync] Queueing ${result.newGameIds.length} new games for auto-scrape...`);

    // Get game names for the queue
    const games = await prisma.game.findMany({
      where: { id: { in: result.newGameIds } },
      select: { id: true, name: true },
    });

    // Queue games for scraping (non-blocking)
    enqueueScrapeMany(games.map(g => ({ id: g.id, name: g.name })));
    autoScraped = games.length; // This is now "queued" count, not "scraped"
  }

  return {
    ...result,
    autoScraped, // Note: This now means "queued for scraping"
    autoScrapeFailed,
  };
}

// ============================================================================
// Game Scraping (Fetch Details from BGG)
// ============================================================================

/**
 * Strip HTML tags from text
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Scrape a single game using the BGG client
 */
export async function scrapeGame(gameId: string): Promise<boolean> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) {
    console.log(`[Scrape] Game not found: ${gameId}`);
    return false;
  }

  console.log(`[Scrape] Scraping game: ${game.name} (${gameId})`);

  try {
    const client = getBggClient();

    // Fetch game details and gallery images (edition covers for thumbnail selection)
    const [gameDetails, galleryImages] = await Promise.all([
      client.getGameDetails(gameId),
      client.getGalleryImages(gameId),
    ]);

    if (!gameDetails) {
      console.error(`[Scrape] No details found for ${gameId}`);
      return false;
    }

    // Update the game with scraped data
    await prisma.game.update({
      where: { id: gameId },
      data: {
        image: gameDetails.image,
        thumbnail: gameDetails.thumbnail || gameDetails.image,
        rating: gameDetails.rating,
        description: gameDetails.description,
        minPlayers: gameDetails.minPlayers,
        maxPlayers: gameDetails.maxPlayers,
        minPlaytime: gameDetails.minPlaytime,
        maxPlaytime: gameDetails.maxPlaytime,
        minAge: gameDetails.minAge,
        categories: JSON.stringify(gameDetails.categories),
        mechanics: JSON.stringify(gameDetails.mechanics),
        isExpansion: gameDetails.isExpansion,
        availableImages: JSON.stringify(galleryImages),
        lastScraped: new Date(),
        // Extended BGG statistics
        numRatings: gameDetails.numRatings,
        bggRank: gameDetails.bggRank,
        weight: gameDetails.weight,
        designers: JSON.stringify(gameDetails.designers),
      },
    });

    // Create expansion relationships (many-to-many)
    if (gameDetails.isExpansion && gameDetails.baseGameIds.length > 0) {
      // Clear old "expands" relationships for this game
      await prisma.gameRelationship.deleteMany({
        where: { fromGameId: gameId, type: "expands" },
      });

      // Create new relationships for ALL base games (not just ones in collection)
      for (const baseGameId of gameDetails.baseGameIds) {
        // Check if the base game exists in our database
        const baseGameExists = await prisma.game.findUnique({
          where: { id: baseGameId },
          select: { id: true },
        });

        if (baseGameExists) {
          await prisma.gameRelationship.create({
            data: {
              fromGameId: gameId,
              toGameId: baseGameId,
              type: "expands",
            },
          });
          console.log(`[Scrape] Linked expansion ${game.name} -> base game ${baseGameId}`);
        } else {
          console.log(`[Scrape] Base game ${baseGameId} not in database (skipping relationship)`);
        }
      }
    }

    return true;
  } catch (error) {
    console.error(`[Scrape] Failed for ${gameId}:`, error);
    return false;
  }
}

/**
 * Scrape multiple games
 */
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
  const collection = await getPrimaryCollection();

  if (collection.syncSchedule === "manual") {
    return false;
  }

  if (!collection.lastSyncedAt) {
    // Never synced before, sync now
    return true;
  }

  const now = new Date();
  const lastSync = new Date(collection.lastSyncedAt);
  const diffMs = now.getTime() - lastSync.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  switch (collection.syncSchedule) {
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

  const collection = await getPrimaryCollection();
  const result = await performSyncWithAutoScrape(collection.id);

  if (result.success) {
    if (result.autoScraped > 0) {
      console.log(`[Scheduler] Auto-scraped ${result.autoScraped} new games`);
    }
  }
}
