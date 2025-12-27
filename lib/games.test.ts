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
    settings: {
      findUnique: vi.fn(),
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
    isActive: true,
    lastScraped: new Date(),
    availableImages: '["img1.jpg", "img2.jpg"]',
    componentImages: '["comp1.jpg"]',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // ============================================================================
  // getActiveGames
  // ============================================================================

  describe("getActiveGames", () => {
    it("should return active and scraped games", async () => {
      vi.mocked(prisma.game.findMany).mockResolvedValue([mockDbGame]);

      const result = await getActiveGames();

      expect(prisma.game.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          lastScraped: { not: null },
        },
        orderBy: { name: "asc" },
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Wingspan");
    });

    it("should parse JSON fields correctly", async () => {
      vi.mocked(prisma.game.findMany).mockResolvedValue([mockDbGame]);

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
      vi.mocked(prisma.game.findMany).mockResolvedValue([gameWithNulls]);

      const result = await getActiveGames();

      expect(result[0].categories).toEqual([]);
      expect(result[0].mechanics).toEqual([]);
      expect(result[0].availableImages).toEqual([]);
      expect(result[0].componentImages).toEqual([]);
    });

    it("should handle invalid JSON", async () => {
      const gameWithInvalidJson = {
        ...mockDbGame,
        categories: "not valid json",
      };
      vi.mocked(prisma.game.findMany).mockResolvedValue([gameWithInvalidJson]);

      const result = await getActiveGames();

      expect(result[0].categories).toEqual([]);
    });

    it("should return empty array when no games", async () => {
      vi.mocked(prisma.game.findMany).mockResolvedValue([]);

      const result = await getActiveGames();

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // getGameById
  // ============================================================================

  describe("getGameById", () => {
    it("should return game by id", async () => {
      vi.mocked(prisma.game.findUnique).mockResolvedValue(mockDbGame);

      const result = await getGameById("123");

      expect(prisma.game.findUnique).toHaveBeenCalledWith({
        where: { id: "123" },
      });
      expect(result).not.toBeNull();
      expect(result?.name).toBe("Wingspan");
    });

    it("should return null when game not found", async () => {
      vi.mocked(prisma.game.findUnique).mockResolvedValue(null);

      const result = await getGameById("999");

      expect(result).toBeNull();
    });

    it("should parse JSON fields correctly", async () => {
      vi.mocked(prisma.game.findUnique).mockResolvedValue(mockDbGame);

      const result = await getGameById("123");

      expect(result?.categories).toEqual(["Card Game", "Animals"]);
      expect(result?.mechanics).toEqual(["Hand Management", "Engine Building"]);
    });
  });

  // ============================================================================
  // getGameCount
  // ============================================================================

  describe("getGameCount", () => {
    it("should return total and active counts", async () => {
      vi.mocked(prisma.game.count)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(50); // active

      const result = await getGameCount();

      expect(result).toEqual({ total: 100, active: 50 });
    });

    it("should handle zero counts", async () => {
      vi.mocked(prisma.game.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

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
    it("should return settings when they exist", async () => {
      vi.mocked(prisma.settings.findUnique).mockResolvedValue({
        id: "default",
        collectionName: "My Games",
        bggUsername: "testuser",
        syncSchedule: "daily",
        autoScrapeNewGames: true,
        lastScheduledSync: null,
        updatedAt: new Date(),
      });

      const result = await getCollectionSettings();

      expect(result).toEqual({
        collectionName: "My Games",
        bggUsername: "testuser",
      });
    });

    it("should return default bggUsername when settings don't exist", async () => {
      vi.mocked(prisma.settings.findUnique).mockResolvedValue(null);

      const result = await getCollectionSettings();

      expect(result.collectionName).toBeNull();
      expect(result.bggUsername).toBe("");
    });

    it("should return null collectionName when not set", async () => {
      vi.mocked(prisma.settings.findUnique).mockResolvedValue({
        id: "default",
        collectionName: null,
        bggUsername: "testuser",
        syncSchedule: "daily",
        autoScrapeNewGames: false,
        lastScheduledSync: null,
        updatedAt: new Date(),
      });

      const result = await getCollectionSettings();

      expect(result.collectionName).toBeNull();
    });
  });
});
