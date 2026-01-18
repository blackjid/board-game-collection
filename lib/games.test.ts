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
  },
}));

describe("lib/games", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    type: "bgg_sync",
    isPrimary: true,
    bggUsername: "testuser",
    syncSchedule: "daily",
    autoScrapeNewGames: true,
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
        description: null,
        type: "bgg_sync",
        isPrimary: true,
        bggUsername: "testuser",
        syncSchedule: "manual",
        autoScrapeNewGames: false,
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
        description: null,
        type: "bgg_sync",
        isPrimary: true,
        bggUsername: "testuser",
        syncSchedule: "manual",
        autoScrapeNewGames: false,
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
        description: null,
        type: "bgg_sync",
        isPrimary: true,
        bggUsername: "testuser",
        syncSchedule: "manual",
        autoScrapeNewGames: false,
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
        description: null,
        type: "bgg_sync",
        isPrimary: true,
        bggUsername: "testuser",
        syncSchedule: "manual",
        autoScrapeNewGames: false,
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
        description: null,
        type: "bgg_sync",
        isPrimary: true,
        bggUsername: "testuser",
        syncSchedule: "manual",
        autoScrapeNewGames: false,
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
      };
      vi.mocked(prisma.game.findUnique).mockResolvedValue(mockGameWithCollections);

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
        availableImages: [],
        componentImages: [],
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
        availableImages: [],
        componentImages: [],
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
        availableImages: [],
        componentImages: [],
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
        availableImages: [],
        componentImages: [],
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
        syncedAt: syncDate,
        gamesFound: 42,
        gamesAdded: 5,
        status: "success",
        bggUsername: "testuser",
        error: null,
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
});
