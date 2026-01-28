import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import {
  getActiveGames,
  getGameById,
  getGameCount,
  getDisplayImage,
  getCollectionSettings,
  getLastSyncInfo,
  getPrimaryCollection,
  getCollections,
  getManualLists,
  getCollectionWithGames,
  groupGamesByBaseGame,
} from "./games";
import type { GameData } from "./games";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    game: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    collection: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    collectionGame: {
      findMany: vi.fn(),
    },
    syncLog: {
      findFirst: vi.fn(),
    },
    gameRelationship: {
      findMany: vi.fn(),
    },
  },
}));

describe("lib/games", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for gameRelationship - return empty array
    vi.mocked(prisma.gameRelationship.findMany).mockResolvedValue([]);
  });

  const mockDbGame = {
    id: "123",
    name: "Wingspan",
    yearPublished: 2019,
    image: "https://example.com/wingspan.jpg",
    thumbnail: "https://example.com/wingspan-thumb.jpg",
    selectedThumbnail: null,
    description: "A bird-themed game",
    minPlayers: 1,
    maxPlayers: 5,
    minPlaytime: 40,
    maxPlaytime: 70,
    rating: 8.1,
    minAge: 10,
    categories: '["Card Game", "Animals"]',
    mechanics: '["Hand Management", "Engine Building"]',
    isExpansion: false,
    lastScraped: new Date(),
    availableImages: '["img1.jpg", "img2.jpg"]',
    componentImages: '["comp1.jpg"]',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCollection = {
    id: "col-1",
    name: "Primary Collection",
    slug: "primary-collection",
    type: "bgg_sync",
    isPrimary: true,
    isPublic: false,
    shareToken: null,
    bggUsername: "testuser",
    syncSchedule: "daily",
    autoScrapeNewGames: true,
    autoRuleType: null,
    autoRuleConfig: null,
    lastSyncedAt: null,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // ============================================================================
  // getActiveGames
  // ============================================================================

  describe("getActiveGames", () => {
    it("should return games from primary collection only", async () => {
      const mockCollectionGame = {
        id: "cg-1",
        collectionId: "col-1",
        gameId: "123",
        addedBy: "sync",
        addedAt: new Date(),
        game: mockDbGame,
        collection: { id: "col-1", name: "Primary", type: "bgg_sync" },
      };

      // Mock primary collection lookup
      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        id: "col-1",
        name: "Primary Collection",
        slug: "primary-collection",
        description: null,
        type: "bgg_sync",
        isPrimary: true,
        isPublic: false,
        shareToken: null,
        bggUsername: "testuser",
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        autoRuleType: null,
        autoRuleConfig: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.collectionGame.findMany).mockResolvedValue([mockCollectionGame]);

      const result = await getActiveGames();

      // Should query for primary collection first
      expect(prisma.collection.findFirst).toHaveBeenCalledWith({
        where: { isPrimary: true },
        select: { id: true },
      });

      // Should query games only from primary collection
      expect(prisma.collectionGame.findMany).toHaveBeenCalledWith({
        include: {
          game: true,
          collection: {
            select: { id: true, name: true, type: true },
          },
        },
        where: {
          collectionId: "col-1",
          game: {
            lastScraped: { not: null },
          },
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Wingspan");
    });

    it("should return empty array when no primary collection exists", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(null);

      const result = await getActiveGames();

      expect(result).toEqual([]);
      // Should not query collectionGame if no primary collection
      expect(prisma.collectionGame.findMany).not.toHaveBeenCalled();
    });

    it("should parse JSON fields correctly", async () => {
      const mockCollectionGame = {
        id: "cg-1",
        collectionId: "col-1",
        gameId: "123",
        addedBy: "sync",
        addedAt: new Date(),
        game: mockDbGame,
        collection: { id: "col-1", name: "Primary", type: "bgg_sync" },
      };

      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        id: "col-1",
        name: "Primary Collection",
        slug: "primary-collection",
        description: null,
        type: "bgg_sync",
        isPrimary: true,
        isPublic: false,
        shareToken: null,
        bggUsername: "testuser",
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        autoRuleType: null,
        autoRuleConfig: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.collectionGame.findMany).mockResolvedValue([mockCollectionGame]);

      const result = await getActiveGames();

      expect(result[0].categories).toEqual(["Card Game", "Animals"]);
      expect(result[0].mechanics).toEqual(["Hand Management", "Engine Building"]);
      expect(result[0].availableImages).toEqual(["img1.jpg", "img2.jpg"]);
      expect(result[0].componentImages).toEqual(["comp1.jpg"]);
    });

    it("should handle null JSON fields", async () => {
      const gameWithNulls = {
        ...mockDbGame,
        categories: null,
        mechanics: null,
        availableImages: null,
        componentImages: null,
      };
      const mockCollectionGame = {
        id: "cg-1",
        collectionId: "col-1",
        gameId: "123",
        addedBy: "sync",
        addedAt: new Date(),
        game: gameWithNulls,
        collection: { id: "col-1", name: "Primary", type: "bgg_sync" },
      };

      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        id: "col-1",
        name: "Primary Collection",
        slug: "primary-collection",
        description: null,
        type: "bgg_sync",
        isPrimary: true,
        isPublic: false,
        shareToken: null,
        bggUsername: "testuser",
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        autoRuleType: null,
        autoRuleConfig: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.collectionGame.findMany).mockResolvedValue([mockCollectionGame]);

      const result = await getActiveGames();

      expect(result[0].categories).toEqual([]);
      expect(result[0].mechanics).toEqual([]);
      expect(result[0].availableImages).toEqual([]);
      expect(result[0].componentImages).toEqual([]);
    });

    it("should include collections array for each game", async () => {
      // Note: Even though getActiveGames only returns games from primary collection,
      // a game could theoretically be in multiple collections (primary + lists).
      // The collections array shows ALL collections the game is in.
      const mockCollectionGame = {
        id: "cg-1",
        collectionId: "col-1",
        gameId: "123",
        addedBy: "sync",
        addedAt: new Date(),
        game: mockDbGame,
        collection: { id: "col-1", name: "Primary", type: "bgg_sync" },
      };

      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        id: "col-1",
        name: "Primary Collection",
        slug: "primary-collection",
        description: null,
        type: "bgg_sync",
        isPrimary: true,
        isPublic: false,
        shareToken: null,
        bggUsername: "testuser",
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        autoRuleType: null,
        autoRuleConfig: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.collectionGame.findMany).mockResolvedValue([mockCollectionGame]);

      const result = await getActiveGames();

      expect(result).toHaveLength(1);
      expect(result[0].collections).toHaveLength(1);
      expect(result[0].collections?.[0].name).toBe("Primary");
    });

    it("should return empty array when no games in primary collection", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        id: "col-1",
        name: "Primary Collection",
        slug: "primary-collection",
        description: null,
        type: "bgg_sync",
        isPrimary: true,
        isPublic: false,
        shareToken: null,
        bggUsername: "testuser",
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        autoRuleType: null,
        autoRuleConfig: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.collectionGame.findMany).mockResolvedValue([]);

      const result = await getActiveGames();

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // getGameById
  // ============================================================================

  describe("getGameById", () => {
    it("should return game by id with collections", async () => {
      const mockGameWithCollections = {
        ...mockDbGame,
        collections: [
          { collection: { id: "col-1", name: "Primary", type: "bgg_sync" } },
        ],
        relationshipsFrom: [],
        relationshipsTo: [],
      };
      vi.mocked(prisma.game.findUnique).mockResolvedValue(mockGameWithCollections);
      vi.mocked(prisma.collectionGame.findMany).mockResolvedValue([]);

      const result = await getGameById("123");

      expect(prisma.game.findUnique).toHaveBeenCalledWith({
        where: { id: "123" },
        include: {
          collections: {
            include: {
              collection: {
                select: { id: true, name: true, type: true },
              },
            },
          },
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
      expect(result).not.toBeNull();
      expect(result?.name).toBe("Wingspan");
      expect(result?.collections).toHaveLength(1);
    });

    it("should return null when game not found", async () => {
      vi.mocked(prisma.game.findUnique).mockResolvedValue(null);

      const result = await getGameById("999");

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // getGameCount
  // ============================================================================

  describe("getGameCount", () => {
    it("should return total and active counts", async () => {
      vi.mocked(prisma.game.count).mockResolvedValue(100);
      vi.mocked(prisma.collectionGame.findMany).mockResolvedValue([
        { id: "cg-1", collectionId: "col-1", gameId: "1", addedBy: "sync", addedAt: new Date() },
        { id: "cg-2", collectionId: "col-1", gameId: "2", addedBy: "sync", addedAt: new Date() },
      ]);

      const result = await getGameCount();

      expect(result.total).toBe(100);
      expect(result.active).toBe(2);
    });

    it("should handle zero counts", async () => {
      vi.mocked(prisma.game.count).mockResolvedValue(0);
      vi.mocked(prisma.collectionGame.findMany).mockResolvedValue([]);

      const result = await getGameCount();

      expect(result).toEqual({ total: 0, active: 0 });
    });
  });

  // ============================================================================
  // getDisplayImage
  // ============================================================================

  describe("getDisplayImage", () => {
    it("should prefer selectedThumbnail", () => {
      const game: GameData = {
        id: "1",
        name: "Test",
        yearPublished: 2020,
        image: "image.jpg",
        thumbnail: "thumb.jpg",
        selectedThumbnail: "selected.jpg",
        description: null,
        minPlayers: null,
        maxPlayers: null,
        minPlaytime: null,
        maxPlaytime: null,
        rating: null,
        minAge: null,
        categories: [],
        mechanics: [],
        isExpansion: false,
    baseGameId: null,
        availableImages: [],
        componentImages: [],
        lastScraped: null,
      };

      expect(getDisplayImage(game)).toBe("selected.jpg");
    });

    it("should fall back to image when no selectedThumbnail", () => {
      const game: GameData = {
        id: "1",
        name: "Test",
        yearPublished: 2020,
        image: "image.jpg",
        thumbnail: "thumb.jpg",
        selectedThumbnail: null,
        description: null,
        minPlayers: null,
        maxPlayers: null,
        minPlaytime: null,
        maxPlaytime: null,
        rating: null,
        minAge: null,
        categories: [],
        mechanics: [],
        isExpansion: false,
    baseGameId: null,
        availableImages: [],
        componentImages: [],
        lastScraped: null,
      };

      expect(getDisplayImage(game)).toBe("image.jpg");
    });

    it("should fall back to thumbnail when no image", () => {
      const game: GameData = {
        id: "1",
        name: "Test",
        yearPublished: 2020,
        image: null,
        thumbnail: "thumb.jpg",
        selectedThumbnail: null,
        description: null,
        minPlayers: null,
        maxPlayers: null,
        minPlaytime: null,
        maxPlaytime: null,
        rating: null,
        minAge: null,
        categories: [],
        mechanics: [],
        isExpansion: false,
    baseGameId: null,
        availableImages: [],
        componentImages: [],
        lastScraped: null,
      };

      expect(getDisplayImage(game)).toBe("thumb.jpg");
    });

    it("should return null when no images available", () => {
      const game: GameData = {
        id: "1",
        name: "Test",
        yearPublished: 2020,
        image: null,
        thumbnail: null,
        selectedThumbnail: null,
        description: null,
        minPlayers: null,
        maxPlayers: null,
        minPlaytime: null,
        maxPlaytime: null,
        rating: null,
        minAge: null,
        categories: [],
        mechanics: [],
        isExpansion: false,
    baseGameId: null,
        availableImages: [],
        componentImages: [],
        lastScraped: null,
      };

      expect(getDisplayImage(game)).toBeNull();
    });
  });

  // ============================================================================
  // getCollectionSettings
  // ============================================================================

  describe("getCollectionSettings", () => {
    it("should return settings from primary collection", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(mockCollection);

      const result = await getCollectionSettings();

      expect(prisma.collection.findFirst).toHaveBeenCalledWith({
        where: { isPrimary: true },
      });
      expect(result).toEqual({
        collectionName: "Primary Collection",
        bggUsername: "testuser",
      });
    });

    it("should return null values when no primary collection exists", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(null);

      const result = await getCollectionSettings();

      expect(result.collectionName).toBeNull();
      expect(result.bggUsername).toBeNull();
    });
  });

  // ============================================================================
  // getLastSyncInfo
  // ============================================================================

  describe("getLastSyncInfo", () => {
    it("should return last sync info", async () => {
      const syncDate = new Date("2024-01-15T12:00:00Z");
      vi.mocked(prisma.syncLog.findFirst).mockResolvedValue({
        id: "sync-1",
        username: "testuser",
        syncedAt: syncDate,
        gamesFound: 42,
        status: "success",
      });

      const result = await getLastSyncInfo();

      expect(prisma.syncLog.findFirst).toHaveBeenCalledWith({
        where: { status: "success" },
        orderBy: { syncedAt: "desc" },
      });
      expect(result.syncedAt).toEqual(syncDate);
      expect(result.gamesFound).toBe(42);
    });

    it("should return null values when no sync log exists", async () => {
      vi.mocked(prisma.syncLog.findFirst).mockResolvedValue(null);

      const result = await getLastSyncInfo();

      expect(result.syncedAt).toBeNull();
      expect(result.gamesFound).toBe(0);
    });
  });

  // ============================================================================
  // getPrimaryCollection
  // ============================================================================

  describe("getPrimaryCollection", () => {
    it("should return primary collection with preview images", async () => {
      const mockPrimaryCollection = {
        ...mockCollection,
        games: [
          { game: { selectedThumbnail: "selected1.jpg", thumbnail: null, image: null } },
          { game: { selectedThumbnail: null, thumbnail: "thumb2.jpg", image: null } },
        ],
        _count: { games: 10 },
      };
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(mockPrimaryCollection as never);

      const result = await getPrimaryCollection();

      expect(result).not.toBeNull();
      expect(result?.name).toBe("Primary Collection");
      expect(result?.gameCount).toBe(10);
      expect(result?.previewImages).toEqual(["selected1.jpg", "thumb2.jpg"]);
    });

    it("should return null when no primary collection exists", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(null);

      const result = await getPrimaryCollection();

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // getCollections
  // ============================================================================

  describe("getCollections", () => {
    it("should return all collections with counts and preview images", async () => {
      const mockCollections = [
        {
          ...mockCollection,
          games: [{ game: { selectedThumbnail: "img1.jpg", thumbnail: null, image: null } }],
          _count: { games: 5 },
        },
        {
          id: "col-2",
          name: "Favorites",
          type: "manual",
          isPrimary: false,
          bggUsername: null,
          syncSchedule: "manual",
          autoScrapeNewGames: false,
          lastSyncedAt: null,
          description: "My favorites",
          games: [],
          _count: { games: 0 },
        },
      ];
      vi.mocked(prisma.collection.findMany).mockResolvedValue(mockCollections as never);

      const result = await getCollections();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Primary Collection");
      expect(result[0].gameCount).toBe(5);
      expect(result[1].name).toBe("Favorites");
      expect(result[1].gameCount).toBe(0);
    });

    it("should return empty array when no collections exist", async () => {
      vi.mocked(prisma.collection.findMany).mockResolvedValue([]);

      const result = await getCollections();

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // getManualLists
  // ============================================================================

  describe("getManualLists", () => {
    it("should return manual lists with game IDs", async () => {
      const mockManualLists = [
        {
          id: "list-1",
          name: "Party Games",
          games: [{ gameId: "game-1" }, { gameId: "game-2" }],
        },
        {
          id: "list-2",
          name: "Strategy Games",
          games: [{ gameId: "game-3" }],
        },
      ];
      vi.mocked(prisma.collection.findMany).mockResolvedValue(mockManualLists as never);

      const result = await getManualLists();

      expect(prisma.collection.findMany).toHaveBeenCalledWith({
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
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Party Games");
      expect(result[0].gameIds).toEqual(["game-1", "game-2"]);
    });

    it("should return empty array when no manual lists exist", async () => {
      vi.mocked(prisma.collection.findMany).mockResolvedValue([]);

      const result = await getManualLists();

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // getCollectionWithGames
  // ============================================================================

  describe("getCollectionWithGames", () => {
    it("should return collection with all games", async () => {
      const mockCollectionWithGames = {
        ...mockCollection,
        games: [
          {
            game: mockDbGame,
          },
        ],
        _count: { games: 1 },
      };
      vi.mocked(prisma.collection.findUnique).mockResolvedValue(mockCollectionWithGames as never);

      const result = await getCollectionWithGames("col-1");

      expect(prisma.collection.findUnique).toHaveBeenCalledWith({
        where: { id: "col-1" },
        include: expect.any(Object),
      });
      expect(result).not.toBeNull();
      expect(result?.name).toBe("Primary Collection");
      expect(result?.games).toHaveLength(1);
      expect(result?.games[0].name).toBe("Wingspan");
    });

    it("should return null when collection not found", async () => {
      vi.mocked(prisma.collection.findUnique).mockResolvedValue(null);

      const result = await getCollectionWithGames("nonexistent");

      expect(result).toBeNull();
    });

    it("should filter out games without lastScraped", async () => {
      const gameWithoutScrape = { ...mockDbGame, lastScraped: null };
      const mockCollectionWithGames = {
        ...mockCollection,
        games: [
          { game: mockDbGame },
          { game: gameWithoutScrape },
        ],
        _count: { games: 2 },
      };
      vi.mocked(prisma.collection.findUnique).mockResolvedValue(mockCollectionWithGames as never);

      const result = await getCollectionWithGames("col-1");

      // Should only include the game that has been scraped
      expect(result?.games).toHaveLength(1);
    });
  });

  // ============================================================================
  // groupGamesByBaseGame
  // ============================================================================

  describe("groupGamesByBaseGame", () => {
    // Helper to create mock games with relationships
    const createMockGameData = (overrides: Partial<GameData> = {}): GameData => ({
      id: "1",
      name: "Test Game",
      yearPublished: 2020,
      image: "image.jpg",
      thumbnail: "thumb.jpg",
      selectedThumbnail: null,
      description: null,
      minPlayers: 2,
      maxPlayers: 4,
      minPlaytime: 30,
      maxPlaytime: 60,
      rating: 7.5,
      minAge: 10,
      categories: [],
      mechanics: [],
      isExpansion: false,
      availableImages: [],
      componentImages: [],
      lastScraped: new Date().toISOString(),
      expandsGames: [],
      requiredGames: [],
      expansions: [],
      requiredBy: [],
      ...overrides,
    });

    it("should group base games without expansions", () => {
      const games = [
        createMockGameData({ id: "1", name: "Catan" }),
        createMockGameData({ id: "2", name: "Wingspan" }),
      ];

      const groups = groupGamesByBaseGame(games);

      expect(groups).toHaveLength(2);
      expect(groups[0].baseGame.name).toBe("Catan");
      expect(groups[0].expansions).toHaveLength(0);
      expect(groups[0].isOrphanedExpansion).toBe(false);
      expect(groups[1].baseGame.name).toBe("Wingspan");
    });

    it("should group expansions with their base games", () => {
      const baseGame = createMockGameData({ id: "1", name: "Catan" });
      const expansion = createMockGameData({
        id: "2",
        name: "Catan: Seafarers",
        isExpansion: true,
        expandsGames: [{ id: "1", name: "Catan", thumbnail: null, inCollection: true }],
      });

      const groups = groupGamesByBaseGame([baseGame, expansion]);

      expect(groups).toHaveLength(1);
      expect(groups[0].baseGame.name).toBe("Catan");
      expect(groups[0].expansions).toHaveLength(1);
      expect(groups[0].expansions[0].name).toBe("Catan: Seafarers");
    });

    it("should show expansion under ALL matching base games (many-to-many)", () => {
      const catan = createMockGameData({ id: "1", name: "Catan" });
      const catanEurope = createMockGameData({ id: "2", name: "Catan: Europe" });
      // This expansion works with BOTH base games
      const expansion = createMockGameData({
        id: "3",
        name: "Catan: UK & Pennsylvania",
        isExpansion: true,
        expandsGames: [
          { id: "1", name: "Catan", thumbnail: null, inCollection: true },
          { id: "2", name: "Catan: Europe", thumbnail: null, inCollection: true },
        ],
      });

      const groups = groupGamesByBaseGame([catan, catanEurope, expansion]);

      expect(groups).toHaveLength(2);
      
      // Expansion should appear under Catan
      const catanGroup = groups.find(g => g.baseGame.name === "Catan");
      expect(catanGroup?.expansions).toHaveLength(1);
      expect(catanGroup?.expansions[0].name).toBe("Catan: UK & Pennsylvania");
      
      // Expansion should ALSO appear under Catan: Europe
      const europeGroup = groups.find(g => g.baseGame.name === "Catan: Europe");
      expect(europeGroup?.expansions).toHaveLength(1);
      expect(europeGroup?.expansions[0].name).toBe("Catan: UK & Pennsylvania");
    });

    it("should mark orphaned expansions when base game not in collection", () => {
      // Expansion without its base game in the collection
      const orphanedExpansion = createMockGameData({
        id: "1",
        name: "Catan: Seafarers",
        isExpansion: true,
        expandsGames: [{ id: "99", name: "Catan", thumbnail: null, inCollection: false }],
      });

      const groups = groupGamesByBaseGame([orphanedExpansion]);

      expect(groups).toHaveLength(1);
      expect(groups[0].isOrphanedExpansion).toBe(true);
      expect(groups[0].baseGame.name).toBe("Catan: Seafarers");
      expect(groups[0].missingRequirements).toContain("Catan");
    });

    it("should list missing requirements for orphaned expansions", () => {
      const orphanedExpansion = createMockGameData({
        id: "1",
        name: "Some Expansion",
        isExpansion: true,
        expandsGames: [
          { id: "99", name: "Base Game 1", thumbnail: null, inCollection: false },
          { id: "100", name: "Base Game 2", thumbnail: null, inCollection: false },
        ],
      });

      const groups = groupGamesByBaseGame([orphanedExpansion]);

      expect(groups).toHaveLength(1);
      expect(groups[0].isOrphanedExpansion).toBe(true);
      expect(groups[0].missingRequirements).toEqual(["Base Game 1", "Base Game 2"]);
    });

    it("should not mark expansion as orphaned if at least one base game is in collection", () => {
      const catan = createMockGameData({ id: "1", name: "Catan" });
      const expansion = createMockGameData({
        id: "2",
        name: "Catan: UK",
        isExpansion: true,
        expandsGames: [
          { id: "1", name: "Catan", thumbnail: null, inCollection: true },
          // TTR Europe is not in collection, but Catan is - so not orphaned
          { id: "99", name: "TTR Europe", thumbnail: null, inCollection: false },
        ],
      });

      const groups = groupGamesByBaseGame([catan, expansion]);

      expect(groups).toHaveLength(1);
      expect(groups[0].isOrphanedExpansion).toBe(false);
      expect(groups[0].expansions).toHaveLength(1);
    });

    it("should sort base games alphabetically", () => {
      const games = [
        createMockGameData({ id: "3", name: "Wingspan" }),
        createMockGameData({ id: "1", name: "Azul" }),
        createMockGameData({ id: "2", name: "Catan" }),
      ];

      const groups = groupGamesByBaseGame(games);

      expect(groups.map(g => g.baseGame.name)).toEqual(["Azul", "Catan", "Wingspan"]);
    });

    it("should sort expansions within a group alphabetically", () => {
      const baseGame = createMockGameData({ id: "1", name: "Catan" });
      const exp1 = createMockGameData({
        id: "2",
        name: "Catan: Traders & Barbarians",
        isExpansion: true,
        expandsGames: [{ id: "1", name: "Catan", thumbnail: null, inCollection: true }],
      });
      const exp2 = createMockGameData({
        id: "3",
        name: "Catan: Cities & Knights",
        isExpansion: true,
        expandsGames: [{ id: "1", name: "Catan", thumbnail: null, inCollection: true }],
      });
      const exp3 = createMockGameData({
        id: "4",
        name: "Catan: Seafarers",
        isExpansion: true,
        expandsGames: [{ id: "1", name: "Catan", thumbnail: null, inCollection: true }],
      });

      const groups = groupGamesByBaseGame([baseGame, exp1, exp2, exp3]);

      expect(groups[0].expansions.map(e => e.name)).toEqual([
        "Catan: Cities & Knights",
        "Catan: Seafarers",
        "Catan: Traders & Barbarians",
      ]);
    });

    it("should handle empty game list", () => {
      const groups = groupGamesByBaseGame([]);
      expect(groups).toEqual([]);
    });

    it("should handle only expansions with no base games in collection", () => {
      const exp1 = createMockGameData({
        id: "1",
        name: "Expansion A",
        isExpansion: true,
        expandsGames: [{ id: "99", name: "Base A", thumbnail: null, inCollection: false }],
      });
      const exp2 = createMockGameData({
        id: "2",
        name: "Expansion B",
        isExpansion: true,
        expandsGames: [{ id: "100", name: "Base B", thumbnail: null, inCollection: false }],
      });

      const groups = groupGamesByBaseGame([exp1, exp2]);

      expect(groups).toHaveLength(2);
      expect(groups.every(g => g.isOrphanedExpansion)).toBe(true);
    });
  });

  // ============================================================================
  // getGameById - Relationship Transformation
  // ============================================================================

  describe("getGameById - relationships", () => {
    it("should transform relationshipsFrom to expandsGames and requiredGames", async () => {
      const mockGameWithRelationships = {
        ...mockDbGame,
        isExpansion: true,
        collections: [],
        relationshipsFrom: [
          {
            id: "rel-1",
            type: "expands",
            toGame: { id: "base-1", name: "Catan", thumbnail: "thumb.jpg", selectedThumbnail: null, image: null },
          },
          {
            id: "rel-2",
            type: "requires",
            toGame: { id: "req-1", name: "5-6 Player Extension", thumbnail: null, selectedThumbnail: null, image: null },
          },
        ],
        relationshipsTo: [],
      };
      vi.mocked(prisma.game.findUnique).mockResolvedValue(mockGameWithRelationships as never);
      vi.mocked(prisma.collectionGame.findMany).mockResolvedValue([
        { gameId: "base-1" } as never, // base-1 is in collection
      ]);

      const result = await getGameById("123");

      expect(result?.expandsGames).toHaveLength(1);
      expect(result?.expandsGames[0]).toEqual({
        id: "base-1",
        name: "Catan",
        thumbnail: "thumb.jpg",
        inCollection: true,
      });

      expect(result?.requiredGames).toHaveLength(1);
      expect(result?.requiredGames[0]).toEqual({
        id: "req-1",
        name: "5-6 Player Extension",
        thumbnail: null,
        inCollection: false,
      });
    });

    it("should transform relationshipsTo to expansions and requiredBy", async () => {
      const mockBaseGame = {
        ...mockDbGame,
        isExpansion: false,
        collections: [],
        relationshipsFrom: [],
        relationshipsTo: [
          {
            id: "rel-1",
            type: "expands",
            fromGame: {
              id: "exp-1",
              name: "Catan: Seafarers",
              thumbnail: "exp-thumb.jpg",
              selectedThumbnail: null,
              image: null,
              lastScraped: new Date(),
            },
          },
          {
            id: "rel-2",
            type: "requires",
            fromGame: {
              id: "dep-1",
              name: "Cities & Knights 5-6",
              thumbnail: null,
              selectedThumbnail: null,
              image: null,
              lastScraped: new Date(),
            },
          },
        ],
      };
      vi.mocked(prisma.game.findUnique).mockResolvedValue(mockBaseGame as never);
      vi.mocked(prisma.collectionGame.findMany).mockResolvedValue([
        { gameId: "exp-1" } as never,
      ]);

      const result = await getGameById("123");

      expect(result?.expansions).toHaveLength(1);
      expect(result?.expansions[0]).toEqual({
        id: "exp-1",
        name: "Catan: Seafarers",
        thumbnail: "exp-thumb.jpg",
        inCollection: true,
      });

      expect(result?.requiredBy).toHaveLength(1);
      expect(result?.requiredBy[0]).toEqual({
        id: "dep-1",
        name: "Cities & Knights 5-6",
        thumbnail: null,
        inCollection: false,
      });
    });

    it("should filter out expansions that have not been scraped", async () => {
      const mockBaseGame = {
        ...mockDbGame,
        collections: [],
        relationshipsFrom: [],
        relationshipsTo: [
          {
            id: "rel-1",
            type: "expands",
            fromGame: {
              id: "exp-1",
              name: "Scraped Expansion",
              thumbnail: null,
              selectedThumbnail: null,
              image: null,
              lastScraped: new Date(), // Has been scraped
            },
          },
          {
            id: "rel-2",
            type: "expands",
            fromGame: {
              id: "exp-2",
              name: "Unscraped Expansion",
              thumbnail: null,
              selectedThumbnail: null,
              image: null,
              lastScraped: null, // NOT scraped
            },
          },
        ],
      };
      vi.mocked(prisma.game.findUnique).mockResolvedValue(mockBaseGame as never);
      vi.mocked(prisma.collectionGame.findMany).mockResolvedValue([]);

      const result = await getGameById("123");

      // Only the scraped expansion should appear
      expect(result?.expansions).toHaveLength(1);
      expect(result?.expansions[0].name).toBe("Scraped Expansion");
    });

    it("should use selectedThumbnail over thumbnail in relationships", async () => {
      const mockGameWithRelationships = {
        ...mockDbGame,
        isExpansion: true,
        collections: [],
        relationshipsFrom: [
          {
            id: "rel-1",
            type: "expands",
            toGame: {
              id: "base-1",
              name: "Catan",
              thumbnail: "original-thumb.jpg",
              selectedThumbnail: "selected-thumb.jpg",
              image: "image.jpg",
            },
          },
        ],
        relationshipsTo: [],
      };
      vi.mocked(prisma.game.findUnique).mockResolvedValue(mockGameWithRelationships as never);
      vi.mocked(prisma.collectionGame.findMany).mockResolvedValue([]);

      const result = await getGameById("123");

      // Should prefer selectedThumbnail
      expect(result?.expandsGames[0].thumbnail).toBe("selected-thumb.jpg");
    });
  });
});
