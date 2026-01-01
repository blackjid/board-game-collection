import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import {
  getActiveGames,
  getGameById,
  getGameCount,
  getDisplayImage,
  getCollectionSettings,
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
    },
    collectionGame: {
      findMany: vi.fn(),
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
    it("should return games from collections", async () => {
      const mockCollectionGame = {
        id: "cg-1",
        collectionId: "col-1",
        gameId: "123",
        addedBy: "sync",
        addedAt: new Date(),
        game: mockDbGame,
        collection: { id: "col-1", name: "Primary", type: "bgg_sync" },
      };
      vi.mocked(prisma.collectionGame.findMany).mockResolvedValue([mockCollectionGame]);

      const result = await getActiveGames();

      expect(prisma.collectionGame.findMany).toHaveBeenCalledWith({
        include: {
          game: true,
          collection: {
            select: { id: true, name: true, type: true },
          },
        },
        where: {
          game: {
            lastScraped: { not: null },
          },
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Wingspan");
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
      vi.mocked(prisma.collectionGame.findMany).mockResolvedValue([mockCollectionGame]);

      const result = await getActiveGames();

      expect(result[0].categories).toEqual([]);
      expect(result[0].mechanics).toEqual([]);
      expect(result[0].availableImages).toEqual([]);
      expect(result[0].componentImages).toEqual([]);
    });

    it("should deduplicate games in multiple collections", async () => {
      const mockCollectionGames = [
        {
          id: "cg-1",
          collectionId: "col-1",
          gameId: "123",
          addedBy: "sync",
          addedAt: new Date(),
          game: mockDbGame,
          collection: { id: "col-1", name: "Primary", type: "bgg_sync" },
        },
        {
          id: "cg-2",
          collectionId: "col-2",
          gameId: "123",
          addedBy: "manual",
          addedAt: new Date(),
          game: mockDbGame,
          collection: { id: "col-2", name: "Favorites", type: "manual" },
        },
      ];
      vi.mocked(prisma.collectionGame.findMany).mockResolvedValue(mockCollectionGames);

      const result = await getActiveGames();

      expect(result).toHaveLength(1);
      expect(result[0].collections).toHaveLength(2);
    });

    it("should return empty array when no games", async () => {
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
});
