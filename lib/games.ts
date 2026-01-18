import prisma from "./prisma";
import type { Collection, CollectionGame, Game } from "@prisma/client";

// ============================================================================
// Prisma Result Types (for callback type annotations)
// ============================================================================

type CollectionGameWithGame = CollectionGame & {
  game: Game;
};

type CollectionGameWithCollection = CollectionGame & {
  collection: Pick<Collection, "id" | "name" | "type">;
};

type CollectionGameWithGamePreview = CollectionGame & {
  game: Pick<Game, "selectedThumbnail" | "thumbnail" | "image">;
};

type CollectionWithGamesAndCount = Collection & {
  games: CollectionGameWithGamePreview[];
  _count: { games: number };
};

// ============================================================================
// Game Data Types
// ============================================================================

export interface GameData {
  id: string;
  name: string;
  yearPublished: number | null;
  image: string | null;
  thumbnail: string | null;
  selectedThumbnail: string | null;
  description: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  minPlaytime: number | null;
  maxPlaytime: number | null;
  rating: number | null;
  minAge: number | null;
  categories: string[];
  mechanics: string[];
  isExpansion: boolean;
  availableImages: string[];
  componentImages: string[];
  lastScraped: string | null;
  // Collections this game belongs to
  collections?: { id: string; name: string; type: string }[];
}

function parseJsonArray(json: string | null): string[] {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function transformGame(game: Awaited<ReturnType<typeof prisma.game.findFirst>>): GameData | null {
  if (!game) return null;

  return {
    id: game.id,
    name: game.name,
    yearPublished: game.yearPublished,
    image: game.image,
    thumbnail: game.thumbnail,
    selectedThumbnail: game.selectedThumbnail,
    description: game.description,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    minPlaytime: game.minPlaytime,
    maxPlaytime: game.maxPlaytime,
    rating: game.rating,
    minAge: game.minAge,
    categories: parseJsonArray(game.categories),
    mechanics: parseJsonArray(game.mechanics),
    isExpansion: game.isExpansion,
    availableImages: parseJsonArray(game.availableImages),
    componentImages: parseJsonArray(game.componentImages),
    lastScraped: game.lastScraped?.toISOString() ?? null,
  };
}

// ============================================================================
// Game Queries
// ============================================================================

/**
 * Get games from the primary collection (default view)
 * This replaces the old `isVisible: true` query
 */
export async function getActiveGames(): Promise<GameData[]> {
  // Get the primary collection
  const primaryCollection = await prisma.collection.findFirst({
    where: { isPrimary: true },
    select: { id: true },
  });

  if (!primaryCollection) {
    return [];
  }

  // Get all games in the primary collection that have been scraped
  const collectionGames = await prisma.collectionGame.findMany({
    include: {
      game: true,
      collection: {
        select: { id: true, name: true, type: true },
      },
    },
    where: {
      collectionId: primaryCollection.id,
      game: {
        lastScraped: { not: null },
      },
    },
  });

  // Group by game ID to deduplicate and collect collection memberships
  const gameMap = new Map<string, GameData>();

  for (const cg of collectionGames) {
    const gameId = cg.game.id;

    if (!gameMap.has(gameId)) {
      const gameData = transformGame(cg.game);
      if (gameData) {
        gameData.collections = [];
        gameMap.set(gameId, gameData);
      }
    }

    const gameData = gameMap.get(gameId);
    if (gameData && gameData.collections) {
      gameData.collections.push({
        id: cg.collection.id,
        name: cg.collection.name,
        type: cg.collection.type,
      });
    }
  }

  // Convert to array and sort by name
  return Array.from(gameMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getGameById(id: string): Promise<GameData | null> {
  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      collections: {
        include: {
          collection: {
            select: { id: true, name: true, type: true },
          },
        },
      },
    },
  });

  if (!game) return null;

  const gameData = transformGame(game);
  if (gameData) {
    gameData.collections = game.collections.map((cg: CollectionGameWithCollection) => ({
      id: cg.collection.id,
      name: cg.collection.name,
      type: cg.collection.type,
    }));
  }

  return gameData;
}

export async function getGameCount(): Promise<{ total: number; active: number }> {
  // Total: all games in the database
  const total = await prisma.game.count();

  // Active: games that are in at least one collection and have been scraped
  const activeGames = await prisma.collectionGame.findMany({
    where: {
      game: {
        lastScraped: { not: null },
      },
    },
    select: {
      gameId: true,
    },
    distinct: ["gameId"],
  });

  return { total, active: activeGames.length };
}

// Helper to get the display image (selectedThumbnail or fallback to image)
export function getDisplayImage(game: GameData): string | null {
  return game.selectedThumbnail || game.image || game.thumbnail;
}

// ============================================================================
// Collection Types
// ============================================================================

export interface CollectionSummary {
  id: string;
  name: string;
  description: string | null;
  type: string; // "bgg_sync" | "manual"
  isPrimary: boolean;
  bggUsername: string | null;
  lastSyncedAt: Date | null;
  syncSchedule: string;
  autoScrapeNewGames: boolean;
  gameCount: number;
  previewImages: string[];
}

export interface CollectionWithGames extends CollectionSummary {
  games: GameData[];
}

// ============================================================================
// Collection Settings (Legacy compatibility)
// ============================================================================

export interface CollectionSettings {
  collectionName: string | null;
  bggUsername: string | null;
}

/**
 * Get collection settings from the primary collection
 * This provides backward compatibility with code expecting the old Settings model
 */
export async function getCollectionSettings(): Promise<CollectionSettings> {
  const primaryCollection = await prisma.collection.findFirst({
    where: { isPrimary: true },
  });

  return {
    collectionName: primaryCollection?.name || null,
    bggUsername: primaryCollection?.bggUsername || null,
  };
}

export interface LastSyncInfo {
  syncedAt: Date | null;
  gamesFound: number;
}

export async function getLastSyncInfo(): Promise<LastSyncInfo> {
  const lastSync = await prisma.syncLog.findFirst({
    where: { status: "success" },
    orderBy: { syncedAt: "desc" },
  });

  return {
    syncedAt: lastSync?.syncedAt || null,
    gamesFound: lastSync?.gamesFound || 0,
  };
}

// ============================================================================
// Collection Queries
// ============================================================================

/**
 * Get the primary collection (main BGG-synced collection)
 */
export async function getPrimaryCollection(): Promise<CollectionSummary | null> {
  const collection = await prisma.collection.findFirst({
    where: { isPrimary: true },
    include: {
      games: {
        include: {
          game: {
            select: {
              selectedThumbnail: true,
              thumbnail: true,
              image: true,
            },
          },
        },
        orderBy: { addedAt: "desc" },
        take: 4,
      },
      _count: {
        select: { games: true },
      },
    },
  });

  if (!collection) return null;

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    type: collection.type,
    isPrimary: collection.isPrimary,
    bggUsername: collection.bggUsername,
    lastSyncedAt: collection.lastSyncedAt,
    syncSchedule: collection.syncSchedule,
    autoScrapeNewGames: collection.autoScrapeNewGames,
    gameCount: collection._count.games,
    previewImages: collection.games
      .map((cg: CollectionGameWithGamePreview) => cg.game.selectedThumbnail || cg.game.thumbnail || cg.game.image)
      .filter((img: string | null): img is string => img !== null),
  };
}

/**
 * Get all collections with their game counts and preview images
 */
export async function getCollections(): Promise<CollectionSummary[]> {
  const collections = await prisma.collection.findMany({
    include: {
      games: {
        include: {
          game: {
            select: {
              selectedThumbnail: true,
              thumbnail: true,
              image: true,
            },
          },
        },
        orderBy: { addedAt: "desc" },
        take: 4,
      },
      _count: {
        select: { games: true },
      },
    },
    orderBy: [
      { isPrimary: "desc" }, // Primary collection first
      { updatedAt: "desc" },
    ],
  });

  return collections.map((collection: CollectionWithGamesAndCount) => ({
    id: collection.id,
    name: collection.name,
    description: collection.description,
    type: collection.type,
    isPrimary: collection.isPrimary,
    bggUsername: collection.bggUsername,
    lastSyncedAt: collection.lastSyncedAt,
    syncSchedule: collection.syncSchedule,
    autoScrapeNewGames: collection.autoScrapeNewGames,
    gameCount: collection._count.games,
    previewImages: collection.games
      .map((cg: CollectionGameWithGamePreview) => cg.game.selectedThumbnail || cg.game.thumbnail || cg.game.image)
      .filter((img: string | null): img is string => img !== null),
  }));
}

/**
 * Get manual lists only (for "Add to List" dropdown)
 * Returns a simplified list structure with just id, name, and game IDs
 */
export interface ManualListSummary {
  id: string;
  name: string;
  gameIds: string[];
}

export async function getManualLists(): Promise<ManualListSummary[]> {
  const collections = await prisma.collection.findMany({
    where: {
      type: "manual",
      isPrimary: false,
    },
    include: {
      games: {
        select: { gameId: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    gameIds: collection.games.map((cg) => cg.gameId),
  }));
}

/**
 * Get a specific collection with all its games
 */
export async function getCollectionWithGames(collectionId: string): Promise<CollectionWithGames | null> {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: {
      games: {
        include: {
          game: true,
        },
        orderBy: { addedAt: "desc" },
      },
      _count: {
        select: { games: true },
      },
    },
  });

  if (!collection) return null;

  // Filter to only include games that have been scraped (have full data)
  const games = collection.games
    .filter((cg: CollectionGameWithGame) => cg.game.lastScraped !== null)
    .map((cg: CollectionGameWithGame) => transformGame(cg.game))
    .filter((g: GameData | null): g is GameData => g !== null);

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    type: collection.type,
    isPrimary: collection.isPrimary,
    bggUsername: collection.bggUsername,
    lastSyncedAt: collection.lastSyncedAt,
    syncSchedule: collection.syncSchedule,
    autoScrapeNewGames: collection.autoScrapeNewGames,
    gameCount: collection._count.games,
    previewImages: collection.games
      .slice(0, 4)
      .map((cg: CollectionGameWithGame) => cg.game.selectedThumbnail || cg.game.thumbnail || cg.game.image)
      .filter((img: string | null): img is string => img !== null),
    games,
  };
}
