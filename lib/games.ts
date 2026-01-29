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


// ============================================================================
// Game Data Types
// ============================================================================

// Game info for relationship references (base games, expansions, requirements)
export interface GameRelationshipRef {
  id: string;
  name: string;
  thumbnail: string | null;
  inCollection: boolean; // True if this game is in any collection
}

// Deprecated: Use GameRelationshipRef instead
export interface GameReference {
  id: string;
  name: string;
  thumbnail: string | null;
}

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
  // Extended BGG statistics
  numRatings: number | null;
  bggRank: number | null;
  weight: number | null; // Complexity (1-5 scale)
  designers: string[];
  // Collections this game belongs to
  collections?: { id: string; name: string; type: string }[];
  // Game relationships (many-to-many)
  expandsGames: GameRelationshipRef[];    // Base games this expansion works with
  requiredGames: GameRelationshipRef[];   // Games required to play this
  expansions: GameRelationshipRef[];      // Expansions for this base game
  requiredBy: GameRelationshipRef[];      // Games that require this
  // List-specific fields (only present when viewing a list)
  contributorId?: string | null;
  contributor?: { id: string; displayName: string } | null;
  isInPrimaryCollection?: boolean;
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
    // Extended BGG statistics
    numRatings: game.numRatings,
    bggRank: game.bggRank,
    weight: game.weight,
    designers: parseJsonArray(game.designers),
    // Relationships are populated separately when needed
    expandsGames: [],
    requiredGames: [],
    expansions: [],
    requiredBy: [],
  };
}

// ============================================================================
// Relationship Population Helpers
// ============================================================================

/**
 * Populate relationships for a list of games
 * This is more efficient than fetching relationships for each game individually
 */
async function populateGameRelationships(games: GameData[]): Promise<void> {
  if (games.length === 0) return;

  const gameIds = games.map((g) => g.id);
  const gameMap = new Map(games.map((g) => [g.id, g]));

  // Fetch all "expands" relationships where these games are the "from" side
  const expandsRelations = await prisma.gameRelationship.findMany({
    where: {
      fromGameId: { in: gameIds },
      type: "expands",
    },
    include: {
      toGame: {
        select: {
          id: true,
          name: true,
          thumbnail: true,
          selectedThumbnail: true,
          image: true,
        },
      },
    },
  });

  // Check which related games are in any collection
  const relatedGameIds = new Set<string>();
  expandsRelations.forEach((r) => relatedGameIds.add(r.toGameId));

  const gamesInCollections = new Set<string>();
  if (relatedGameIds.size > 0) {
    const memberships = await prisma.collectionGame.findMany({
      where: { gameId: { in: Array.from(relatedGameIds) } },
      select: { gameId: true },
      distinct: ["gameId"],
    });
    memberships.forEach((m) => gamesInCollections.add(m.gameId));
  }

  // Populate the expandsGames for each game
  for (const relation of expandsRelations) {
    const game = gameMap.get(relation.fromGameId);
    if (game) {
      game.expandsGames.push({
        id: relation.toGame.id,
        name: relation.toGame.name,
        thumbnail:
          relation.toGame.selectedThumbnail ||
          relation.toGame.thumbnail ||
          relation.toGame.image,
        inCollection: gamesInCollections.has(relation.toGame.id),
      });
    }
  }

  // Sort expandsGames by name for each game
  for (const game of games) {
    game.expandsGames.sort((a, b) => a.name.localeCompare(b.name));
  }
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
  const result = Array.from(gameMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  // Populate relationships for grouping
  await populateGameRelationships(result);

  return result;
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
      // Get relationships where this game is the "from" side
      relationshipsFrom: {
        include: {
          toGame: {
            select: {
              id: true,
              name: true,
              thumbnail: true,
              selectedThumbnail: true,
              image: true,
            },
          },
        },
      },
      // Get relationships where this game is the "to" side
      relationshipsTo: {
        include: {
          fromGame: {
            select: {
              id: true,
              name: true,
              thumbnail: true,
              selectedThumbnail: true,
              image: true,
              lastScraped: true,
            },
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

    // Get all related game IDs to check collection membership in one query
    const relatedGameIds = new Set<string>();
    game.relationshipsFrom.forEach((r) => relatedGameIds.add(r.toGameId));
    game.relationshipsTo.forEach((r) => relatedGameIds.add(r.fromGameId));

    // Check which related games are in any collection
    const gamesInCollections = new Set<string>();
    if (relatedGameIds.size > 0) {
      const memberships = await prisma.collectionGame.findMany({
        where: { gameId: { in: Array.from(relatedGameIds) } },
        select: { gameId: true },
        distinct: ["gameId"],
      });
      memberships.forEach((m) => gamesInCollections.add(m.gameId));
    }

    // Process "expands" relationships (this game expands those base games)
    gameData.expandsGames = game.relationshipsFrom
      .filter((r) => r.type === "expands")
      .map((r) => ({
        id: r.toGame.id,
        name: r.toGame.name,
        thumbnail: r.toGame.selectedThumbnail || r.toGame.thumbnail || r.toGame.image,
        inCollection: gamesInCollections.has(r.toGame.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Process "requires" relationships (this game requires those games)
    gameData.requiredGames = game.relationshipsFrom
      .filter((r) => r.type === "requires")
      .map((r) => ({
        id: r.toGame.id,
        name: r.toGame.name,
        thumbnail: r.toGame.selectedThumbnail || r.toGame.thumbnail || r.toGame.image,
        inCollection: gamesInCollections.has(r.toGame.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Process expansions (games that expand this one) - only scraped ones
    gameData.expansions = game.relationshipsTo
      .filter((r) => r.type === "expands" && r.fromGame.lastScraped !== null)
      .map((r) => ({
        id: r.fromGame.id,
        name: r.fromGame.name,
        thumbnail: r.fromGame.selectedThumbnail || r.fromGame.thumbnail || r.fromGame.image,
        inCollection: gamesInCollections.has(r.fromGame.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Process "requiredBy" relationships (games that require this one) - only scraped ones
    gameData.requiredBy = game.relationshipsTo
      .filter((r) => r.type === "requires" && r.fromGame.lastScraped !== null)
      .map((r) => ({
        id: r.fromGame.id,
        name: r.fromGame.name,
        thumbnail: r.fromGame.selectedThumbnail || r.fromGame.thumbnail || r.fromGame.image,
        inCollection: gamesInCollections.has(r.fromGame.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
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
// Game Grouping (for grouped expansion view)
// ============================================================================

/**
 * Represents a game group for the grouped view
 * - Base games have their expansions nested
 * - Standalone games (no base game, no expansions) are shown individually
 * - Orphaned expansions (base game not in collection) are grouped separately
 */
export interface GameGroup {
  baseGame: GameData;
  expansions: GameData[];
  isOrphanedExpansion: boolean; // True if this is an expansion without its base game in collection
  missingRequirements: string[]; // Names of required games not in collection
}

/**
 * Groups games by their base game for the grouped view
 * With many-to-many relationships, an expansion may appear under MULTIPLE base games.
 * Returns an array of GameGroups sorted by base game name.
 */
export function groupGamesByBaseGame(games: GameData[]): GameGroup[] {
  const gameMap = new Map<string, GameData>();
  const baseGames: GameData[] = [];
  const expansions: GameData[] = [];

  // First pass: categorize games and build lookup map
  for (const game of games) {
    gameMap.set(game.id, game);

    if (game.isExpansion) {
      expansions.push(game);
    } else {
      baseGames.push(game);
    }
  }

  // Build a map of base game ID -> expansions that work with it
  // Note: we only group expansions under actual BASE GAMES (non-expansions),
  // not under other expansions. This keeps the view flat without deep nesting.
  const baseGameExpansionsMap = new Map<string, GameData[]>();
  const orphanedExpansions: GameData[] = [];

  // Create a set of base game IDs for efficient lookup
  const baseGameIds = new Set(baseGames.map((g) => g.id));

  for (const expansion of expansions) {
    // Find which BASE GAMES (not expansions) this expansion works with that are in the collection
    const baseGamesInCollection = expansion.expandsGames.filter(
      (g) => baseGameIds.has(g.id)
    );

    if (baseGamesInCollection.length > 0) {
      // Group with ALL matching base games in collection
      for (const baseGameRef of baseGamesInCollection) {
        if (!baseGameExpansionsMap.has(baseGameRef.id)) {
          baseGameExpansionsMap.set(baseGameRef.id, []);
        }
        baseGameExpansionsMap.get(baseGameRef.id)!.push(expansion);
      }
    } else {
      // No base game in collection - orphaned expansion
      orphanedExpansions.push(expansion);
    }
  }

  // Build the result groups
  const groups: GameGroup[] = [];

  // Add base games with their expansions
  for (const baseGame of baseGames) {
    const gameExpansions = baseGameExpansionsMap.get(baseGame.id) || [];
    groups.push({
      baseGame,
      expansions: gameExpansions.sort((a, b) => a.name.localeCompare(b.name)),
      isOrphanedExpansion: false,
      missingRequirements: [],
    });
  }

  // Add orphaned expansions as their own groups (flat, no nesting under other expansions)
  for (const orphan of orphanedExpansions) {
    // Calculate missing requirements for orphaned expansions
    const missingRequirements = [
      ...orphan.expandsGames.filter((g) => !g.inCollection).map((g) => g.name),
      ...orphan.requiredGames.filter((g) => !g.inCollection).map((g) => g.name),
    ];

    groups.push({
      baseGame: orphan,
      expansions: [],
      isOrphanedExpansion: true,
      missingRequirements,
    });
  }

  // Sort by base game name
  groups.sort((a, b) => a.baseGame.name.localeCompare(b.baseGame.name));

  return groups;
}

/**
 * Gets the count of expansions in collection for a base game
 */
export function getExpansionCount(groups: GameGroup[], baseGameId: string): number {
  const group = groups.find(g => g.baseGame.id === baseGameId);
  return group?.expansions.length || 0;
}

// ============================================================================
// Automatic Collection Rule Engine
// ============================================================================

interface AutoRuleConfig {
  limit?: number;
}

function parseAutoRuleConfig(config: string | null): AutoRuleConfig {
  if (!config) return {};
  try {
    return JSON.parse(config);
  } catch {
    return {};
  }
}

/**
 * Get games for an automatic collection based on its rule type
 * Automatic collections compute their games dynamically rather than storing them
 */
export async function getAutomaticCollectionGames(
  autoRuleType: string,
  autoRuleConfig: string | null
): Promise<GameData[]> {
  const config = parseAutoRuleConfig(autoRuleConfig);

  switch (autoRuleType) {
    case "top_played":
      return getTopPlayedGames(config.limit ?? 10);
    default:
      console.warn(`Unknown automatic rule type: ${autoRuleType}`);
      return [];
  }
}

/**
 * Get count of games for an automatic collection (for preview without loading all games)
 */
export async function getAutomaticCollectionGameCount(
  autoRuleType: string,
  autoRuleConfig: string | null
): Promise<number> {
  const config = parseAutoRuleConfig(autoRuleConfig);

  switch (autoRuleType) {
    case "top_played": {
      // Count distinct games that have at least one play
      const count = await prisma.gamePlay.groupBy({
        by: ["gameId"],
        _count: { gameId: true },
      });
      // Return the lesser of actual games with plays or the configured limit
      return Math.min(count.length, config.limit ?? 10);
    }
    default:
      return 0;
  }
}

/**
 * Get preview images for an automatic collection
 */
export async function getAutomaticCollectionPreviewImages(
  autoRuleType: string,
  autoRuleConfig: string | null
): Promise<string[]> {
  // Get first 4 games for preview
  const games = await getAutomaticCollectionGames(autoRuleType, autoRuleConfig);
  return games
    .slice(0, 4)
    .map((g) => g.selectedThumbnail || g.thumbnail || g.image)
    .filter((img): img is string => img !== null);
}

/**
 * Rule: top_played
 * Returns the most played games based on GamePlay count
 */
async function getTopPlayedGames(limit: number): Promise<GameData[]> {
  // Group plays by gameId and count, ordered by count descending
  const topPlayed = await prisma.gamePlay.groupBy({
    by: ["gameId"],
    _count: { gameId: true },
    orderBy: { _count: { gameId: "desc" } },
    take: limit,
  });

  if (topPlayed.length === 0) {
    return [];
  }

  // Get the full game data for these games
  const gameIds = topPlayed.map((p) => p.gameId);
  const games = await prisma.game.findMany({
    where: {
      id: { in: gameIds },
      lastScraped: { not: null }, // Only include scraped games
    },
  });

  // Create a map for quick lookup and maintain play count order
  const gameMap = new Map(games.map((g) => [g.id, g]));

  // Return games in order of play count (most played first)
  return topPlayed
    .map((p) => {
      const game = gameMap.get(p.gameId);
      return game ? transformGame(game) : null;
    })
    .filter((g): g is GameData => g !== null);
}

// ============================================================================
// Collection Types
// ============================================================================

export interface CollectionSummary {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  type: string; // "bgg_sync" | "manual" | "automatic"
  isPrimary: boolean;
  isPublic: boolean;
  shareToken: string | null;
  bggUsername: string | null;
  lastSyncedAt: Date | null;
  syncSchedule: string;
  autoScrapeNewGames: boolean;
  autoRuleType?: string | null; // For automatic collections: "top_played", etc.
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
    slug: collection.slug,
    description: collection.description,
    type: collection.type,
    isPrimary: collection.isPrimary,
    isPublic: collection.isPublic,
    shareToken: collection.shareToken,
    bggUsername: collection.bggUsername,
    lastSyncedAt: collection.lastSyncedAt,
    syncSchedule: collection.syncSchedule,
    autoScrapeNewGames: collection.autoScrapeNewGames,
    autoRuleType: collection.autoRuleType,
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
      { type: "asc" }, // Group by type (automatic lists together)
      { updatedAt: "desc" },
    ],
  });

  // Process collections, handling automatic ones specially
  const results: CollectionSummary[] = [];

  for (const collection of collections) {
    // Handle automatic collections - compute game count and previews dynamically
    if (collection.type === "automatic" && collection.autoRuleType) {
      const [gameCount, previewImages] = await Promise.all([
        getAutomaticCollectionGameCount(collection.autoRuleType, collection.autoRuleConfig),
        getAutomaticCollectionPreviewImages(collection.autoRuleType, collection.autoRuleConfig),
      ]);

      results.push({
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        type: collection.type,
        isPrimary: collection.isPrimary,
        isPublic: collection.isPublic,
        shareToken: collection.shareToken,
        bggUsername: collection.bggUsername,
        lastSyncedAt: collection.lastSyncedAt,
        syncSchedule: collection.syncSchedule,
        autoScrapeNewGames: collection.autoScrapeNewGames,
        autoRuleType: collection.autoRuleType,
        gameCount,
        previewImages,
      });
    } else {
      // Regular collections (bgg_sync, manual)
      results.push({
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        type: collection.type,
        isPrimary: collection.isPrimary,
        isPublic: collection.isPublic,
        shareToken: collection.shareToken,
        bggUsername: collection.bggUsername,
        lastSyncedAt: collection.lastSyncedAt,
        syncSchedule: collection.syncSchedule,
        autoScrapeNewGames: collection.autoScrapeNewGames,
        autoRuleType: collection.autoRuleType,
        gameCount: collection._count.games,
        previewImages: collection.games
          .map((cg: CollectionGameWithGamePreview) => cg.game.selectedThumbnail || cg.game.thumbnail || cg.game.image)
          .filter((img: string | null): img is string => img !== null),
      });
    }
  }

  return results;
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

  // Find the primary collection once (for efficiency)
  const primaryCollection = await prisma.collection.findFirst({
    where: { isPrimary: true },
    select: { id: true, name: true, type: true },
  });

  // Handle automatic collections - compute games dynamically
  if (collection.type === "automatic" && collection.autoRuleType) {
    const games = await getAutomaticCollectionGames(
      collection.autoRuleType,
      collection.autoRuleConfig
    );

    // Efficiently check which games are in the primary collection
    const gameIds = games.map(g => g.id);
    if (gameIds.length > 0 && primaryCollection) {
      // Only fetch memberships for the primary collection (much more efficient)
      const primaryMemberships = await prisma.collectionGame.findMany({
        where: {
          collectionId: primaryCollection.id,
          gameId: { in: gameIds },
        },
        select: { gameId: true },
      });

      // Create a Set for O(1) lookup
      const gamesInPrimaryCollection = new Set(primaryMemberships.map(m => m.gameId));

      // Attach minimal collection info - only primary collection membership
      games.forEach(game => {
        game.collections = gamesInPrimaryCollection.has(game.id)
          ? [{ id: primaryCollection.id, name: primaryCollection.name, type: primaryCollection.type }]
          : [];
      });
    } else {
      // No primary collection or no games, mark all as not in collection
      games.forEach(game => {
        game.collections = [];
      });
    }

    // Populate relationships for grouping
    await populateGameRelationships(games);

    return {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      type: collection.type,
      isPrimary: collection.isPrimary,
      isPublic: collection.isPublic,
      shareToken: collection.shareToken,
      bggUsername: collection.bggUsername,
      lastSyncedAt: collection.lastSyncedAt,
      syncSchedule: collection.syncSchedule,
      autoScrapeNewGames: collection.autoScrapeNewGames,
      autoRuleType: collection.autoRuleType,
      gameCount: games.length,
      previewImages: games
        .slice(0, 4)
        .map((g) => g.selectedThumbnail || g.thumbnail || g.image)
        .filter((img): img is string => img !== null),
      games,
    };
  }

  // Filter to only include games that have been scraped (have full data)
  const games = collection.games
    .filter((cg: CollectionGameWithGame) => cg.game.lastScraped !== null)
    .map((cg: CollectionGameWithGame) => transformGame(cg.game))
    .filter((g: GameData | null): g is GameData => g !== null);

  // Efficiently check which games are in the primary collection
  const gameIds = games.map(g => g.id);
  if (gameIds.length > 0 && primaryCollection) {
    // Only fetch memberships for the primary collection (much more efficient)
    const primaryMemberships = await prisma.collectionGame.findMany({
      where: {
        collectionId: primaryCollection.id,
        gameId: { in: gameIds },
      },
      select: { gameId: true },
    });

    // Create a Set for O(1) lookup
    const gamesInPrimaryCollection = new Set(primaryMemberships.map(m => m.gameId));

    // Attach minimal collection info - only primary collection membership
    games.forEach(game => {
      game.collections = gamesInPrimaryCollection.has(game.id)
        ? [{ id: primaryCollection.id, name: primaryCollection.name, type: primaryCollection.type }]
        : [];
    });
  } else {
    // No primary collection or no games, mark all as not in collection
    games.forEach(game => {
      game.collections = [];
    });
  }

  // Populate relationships for grouping
  await populateGameRelationships(games);

  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
    type: collection.type,
    isPrimary: collection.isPrimary,
    isPublic: collection.isPublic,
    shareToken: collection.shareToken,
    bggUsername: collection.bggUsername,
    lastSyncedAt: collection.lastSyncedAt,
    syncSchedule: collection.syncSchedule,
    autoScrapeNewGames: collection.autoScrapeNewGames,
    autoRuleType: collection.autoRuleType,
    gameCount: collection._count.games,
    previewImages: collection.games
      .slice(0, 4)
      .map((cg: CollectionGameWithGame) => cg.game.selectedThumbnail || cg.game.thumbnail || cg.game.image)
      .filter((img: string | null): img is string => img !== null),
    games,
  };
}

/**
 * Get a specific collection by its slug with all its games
 */
export async function getCollectionBySlug(
  slug: string
): Promise<CollectionWithGames | null> {
  const collection = await prisma.collection.findUnique({
    where: { slug },
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

  // Find the primary collection once (for efficiency)
  const primaryCollection = await prisma.collection.findFirst({
    where: { isPrimary: true },
    select: { id: true, name: true, type: true },
  });

  // Handle automatic collections - compute games dynamically
  if (collection.type === "automatic" && collection.autoRuleType) {
    const games = await getAutomaticCollectionGames(
      collection.autoRuleType,
      collection.autoRuleConfig
    );

    // Efficiently check which games are in the primary collection
    const gameIds = games.map(g => g.id);
    if (gameIds.length > 0 && primaryCollection) {
      // Only fetch memberships for the primary collection (much more efficient)
      const primaryMemberships = await prisma.collectionGame.findMany({
        where: {
          collectionId: primaryCollection.id,
          gameId: { in: gameIds },
        },
        select: { gameId: true },
      });

      // Create a Set for O(1) lookup
      const gamesInPrimaryCollection = new Set(primaryMemberships.map(m => m.gameId));

      // Attach minimal collection info - only primary collection membership
      games.forEach(game => {
        game.collections = gamesInPrimaryCollection.has(game.id)
          ? [{ id: primaryCollection.id, name: primaryCollection.name, type: primaryCollection.type }]
          : [];
      });
    } else {
      // No primary collection or no games, mark all as not in collection
      games.forEach(game => {
        game.collections = [];
      });
    }

    // Populate relationships for grouping
    await populateGameRelationships(games);

    return {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      type: collection.type,
      isPrimary: collection.isPrimary,
      isPublic: collection.isPublic,
      shareToken: collection.shareToken,
      bggUsername: collection.bggUsername,
      lastSyncedAt: collection.lastSyncedAt,
      syncSchedule: collection.syncSchedule,
      autoScrapeNewGames: collection.autoScrapeNewGames,
      autoRuleType: collection.autoRuleType,
      gameCount: games.length,
      previewImages: games
        .slice(0, 4)
        .map((g) => g.selectedThumbnail || g.thumbnail || g.image)
        .filter((img): img is string => img !== null),
      games,
    };
  }

  // Filter to only include games that have been scraped (have full data)
  const games = collection.games
    .filter((cg: CollectionGameWithGame) => cg.game.lastScraped !== null)
    .map((cg: CollectionGameWithGame) => transformGame(cg.game))
    .filter((g: GameData | null): g is GameData => g !== null);

  // Efficiently check which games are in the primary collection
  const gameIds = games.map(g => g.id);
  if (gameIds.length > 0 && primaryCollection) {
    // Only fetch memberships for the primary collection (much more efficient)
    const primaryMemberships = await prisma.collectionGame.findMany({
      where: {
        collectionId: primaryCollection.id,
        gameId: { in: gameIds },
      },
      select: { gameId: true },
    });

    // Create a Set for O(1) lookup
    const gamesInPrimaryCollection = new Set(primaryMemberships.map(m => m.gameId));

    // Attach minimal collection info - only primary collection membership
    games.forEach(game => {
      game.collections = gamesInPrimaryCollection.has(game.id)
        ? [{ id: primaryCollection.id, name: primaryCollection.name, type: primaryCollection.type }]
        : [];
    });
  } else {
    // No primary collection or no games, mark all as not in collection
    games.forEach(game => {
      game.collections = [];
    });
  }

  // Populate relationships for grouping
  await populateGameRelationships(games);

  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
    type: collection.type,
    isPrimary: collection.isPrimary,
    isPublic: collection.isPublic,
    shareToken: collection.shareToken,
    bggUsername: collection.bggUsername,
    lastSyncedAt: collection.lastSyncedAt,
    syncSchedule: collection.syncSchedule,
    autoScrapeNewGames: collection.autoScrapeNewGames,
    autoRuleType: collection.autoRuleType,
    gameCount: collection._count.games,
    previewImages: collection.games
      .slice(0, 4)
      .map((cg: CollectionGameWithGame) => cg.game.selectedThumbnail || cg.game.thumbnail || cg.game.image)
      .filter((img: string | null): img is string => img !== null),
    games,
  };
}
