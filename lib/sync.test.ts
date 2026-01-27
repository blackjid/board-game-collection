import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import prisma from "@/lib/prisma";
import {
  isSyncDue,
  getSettings,
  getBggUsername,
  stripHtml,
  getPrimaryCollection,
  syncCollection,
  scrapeGame,
  performSyncWithAutoScrape,
} from "./sync";

// Mock the Prisma client
vi.mock("@/lib/prisma", () => ({
  default: {
    collection: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    game: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    collectionGame: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    syncLog: {
      create: vi.fn(),
    },
    gameRelationship: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// Mock the BGG client
const mockBggClient = {
  clientType: "xmlapi2" as const,
  getCollection: vi.fn(),
  getGameDetails: vi.fn(),
  getGamesDetails: vi.fn(),
  getGalleryImages: vi.fn(),
  search: vi.fn(),
  getHotGames: vi.fn(),
};

vi.mock("@/lib/bgg", () => ({
  getBggClient: () => mockBggClient,
}));

// Mock scrape-queue
vi.mock("./scrape-queue", () => ({
  enqueueScrapeMany: vi.fn(),
}));

describe("lib/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // Test fixtures
  // ============================================================================

  const mockPrimaryCollection = {
    id: "col-1",
    name: "My Collection",
    type: "bgg_sync",
    isPrimary: true,
    bggUsername: "testuser",
    syncSchedule: "daily",
    autoScrapeNewGames: true,
    lastSyncedAt: new Date("2025-01-01"),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // ============================================================================
  // stripHtml tests
  // ============================================================================

  describe("stripHtml", () => {
    it("should strip HTML tags and normalize whitespace", () => {
      const input = "<p>Hello <strong>World</strong></p>  Multiple   spaces";
      const output = stripHtml(input);
      expect(output).toBe("Hello World Multiple spaces");
    });

    it("should handle empty strings", () => {
      expect(stripHtml("")).toBe("");
    });

    it("should handle plain text without HTML", () => {
      const input = "Just plain text";
      const output = stripHtml(input);
      expect(output).toBe("Just plain text");
    });
  });

  // ============================================================================
  // getPrimaryCollection tests
  // ============================================================================

  describe("getPrimaryCollection", () => {
    it("should return existing primary collection", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(
        mockPrimaryCollection
      );

      const collection = await getPrimaryCollection();

      expect(collection).toEqual(mockPrimaryCollection);
      expect(prisma.collection.create).not.toHaveBeenCalled();
    });

    it("should create primary collection if none exists", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.collection.create).mockResolvedValue(
        mockPrimaryCollection
      );

      const collection = await getPrimaryCollection();

      expect(prisma.collection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isPrimary: true,
            type: "manual",
          }),
        })
      );
      expect(collection).toEqual(mockPrimaryCollection);
    });
  });

  // ============================================================================
  // getBggUsername tests
  // ============================================================================

  describe("getBggUsername", () => {
    it("should return the BGG username from primary collection", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(
        mockPrimaryCollection
      );

      const username = await getBggUsername();

      expect(username).toBe("testuser");
    });

    it("should return empty string if no username set", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        ...mockPrimaryCollection,
        bggUsername: null,
      });

      const username = await getBggUsername();

      expect(username).toBe("");
    });
  });

  // ============================================================================
  // getSettings tests
  // ============================================================================

  describe("getSettings", () => {
    it("should return settings from primary collection", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(
        mockPrimaryCollection
      );

      const settings = await getSettings();

      expect(settings).toEqual({
        id: "col-1",
        bggUsername: "testuser",
        collectionName: "My Collection",
        syncSchedule: "daily",
        autoScrapeNewGames: true,
        lastScheduledSync: mockPrimaryCollection.lastSyncedAt,
      });
    });
  });

  // ============================================================================
  // isSyncDue tests
  // ============================================================================

  describe("isSyncDue", () => {
    it("should return false for manual schedule", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        ...mockPrimaryCollection,
        syncSchedule: "manual",
      });

      const isDue = await isSyncDue();
      expect(isDue).toBe(false);
    });

    it("should return true when never synced with daily schedule", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        ...mockPrimaryCollection,
        syncSchedule: "daily",
        lastSyncedAt: null,
      });

      const isDue = await isSyncDue();
      expect(isDue).toBe(true);
    });

    it("should return true for daily when last sync was 25 hours ago", async () => {
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 25);

      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        ...mockPrimaryCollection,
        syncSchedule: "daily",
        lastSyncedAt: yesterday,
      });

      const isDue = await isSyncDue();
      expect(isDue).toBe(true);
    });
  });

  // ============================================================================
  // syncCollection tests
  // ============================================================================

  describe("syncCollection", () => {
    it("should return error if no BGG username configured", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        ...mockPrimaryCollection,
        bggUsername: null,
      });

      const result = await syncCollection();

      expect(result.success).toBe(false);
      expect(result.error).toContain("No BGG username");
    });

    it("should sync games from BGG", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(
        mockPrimaryCollection
      );

      // Mock BGG client to return games
      mockBggClient.getCollection.mockResolvedValue([
        { id: "1", name: "Game 1", yearPublished: 2020, isExpansion: false },
        { id: "2", name: "Game 2", yearPublished: 2021, isExpansion: true },
      ]);

      // Mock DB responses
      vi.mocked(prisma.game.findUnique).mockResolvedValue(null); // Game doesn't exist
      vi.mocked(prisma.collectionGame.findUnique).mockResolvedValue(null); // Link doesn't exist

      const result = await syncCollection();

      expect(result.success).toBe(true);
      expect(result.total).toBe(2);
      expect(result.created).toBe(2);
      expect(prisma.game.create).toHaveBeenCalledTimes(2);
      expect(prisma.collectionGame.create).toHaveBeenCalledTimes(2);
      expect(prisma.syncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "success", gamesFound: 2 }),
        })
      );
    });

    it("should update existing games only if changed", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(
        mockPrimaryCollection
      );

      mockBggClient.getCollection.mockResolvedValue([
        { id: "1", name: "Game 1 Updated", yearPublished: 2020, isExpansion: false },
      ]);

      // Mock DB: Game exists with different name
      vi.mocked(prisma.game.findUnique).mockResolvedValue({
        id: "1",
        name: "Game 1",
        yearPublished: 2020,
        isExpansion: false,
      } as Awaited<ReturnType<typeof prisma.game.findUnique>>);

      // Link exists
      vi.mocked(prisma.collectionGame.findUnique).mockResolvedValue(
        {} as Awaited<ReturnType<typeof prisma.collectionGame.findUnique>>
      );

      const result = await syncCollection();

      expect(result.success).toBe(true);
      expect(result.updated).toBe(1);
      expect(prisma.game.update).toHaveBeenCalled();
    });

    it("should handle sync failures gracefully", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(
        mockPrimaryCollection
      );

      mockBggClient.getCollection.mockRejectedValue(new Error("Network error"));

      const result = await syncCollection();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
      expect(prisma.syncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "failed" }),
        })
      );
    });
  });

  // ============================================================================
  // scrapeGame tests
  // ============================================================================

  describe("scrapeGame", () => {
    it("should return false if game not found in DB", async () => {
      vi.mocked(prisma.game.findUnique).mockResolvedValue(null);
      const success = await scrapeGame("123");
      expect(success).toBe(false);
    });

    it("should scrape game details and update DB", async () => {
      vi.mocked(prisma.game.findUnique).mockResolvedValue({
        id: "123",
        name: "Test Game",
        isExpansion: false,
      } as Awaited<ReturnType<typeof prisma.game.findUnique>>);

      // Mock BGG client responses
      mockBggClient.getGameDetails.mockResolvedValue({
        id: "123",
        name: "Test Game",
        yearPublished: 2020,
        description: "Test Description",
        image: "http://example.com/image.jpg",
        thumbnail: "http://example.com/thumb.jpg",
        rating: 8.5,
        minPlayers: 2,
        maxPlayers: 4,
        minPlaytime: 30,
        maxPlaytime: 60,
        minAge: 12,
        categories: ["Strategy"],
        mechanics: ["Dice"],
        isExpansion: false,
        baseGameIds: [],
        expansionIds: [],
      });

      mockBggClient.getGalleryImages.mockResolvedValue([
        "http://example.com/image.jpg",
        "http://example.com/version1.jpg",
      ]);

      vi.mocked(prisma.gameRelationship.findMany).mockResolvedValue([]);

      const success = await scrapeGame("123");

      expect(success).toBe(true);
      expect(prisma.game.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "123" },
          data: expect.objectContaining({
            description: "Test Description",
            minPlayers: 2,
            maxPlayers: 4,
          }),
        })
      );
    });

    it("should handle expansion relationships", async () => {
      vi.mocked(prisma.game.findUnique).mockResolvedValue({
        id: "123",
        name: "Test Expansion",
        isExpansion: true,
      } as Awaited<ReturnType<typeof prisma.game.findUnique>>);

      mockBggClient.getGameDetails.mockResolvedValue({
        id: "123",
        name: "Test Expansion",
        yearPublished: 2021,
        description: "Expansion description",
        image: "http://example.com/expansion.jpg",
        thumbnail: "http://example.com/thumb.jpg",
        rating: 8.0,
        minPlayers: 2,
        maxPlayers: 4,
        minPlaytime: 30,
        maxPlaytime: 60,
        minAge: 12,
        categories: ["Expansion"],
        mechanics: [],
        isExpansion: true,
        baseGameIds: ["100"],
        expansionIds: [],
      });

      mockBggClient.getGalleryImages.mockResolvedValue([]);

      vi.mocked(prisma.gameRelationship.findMany).mockResolvedValue([]);
      vi.mocked(prisma.game.findUnique).mockResolvedValue({
        id: "100",
      } as Awaited<ReturnType<typeof prisma.game.findUnique>>);

      const success = await scrapeGame("123");

      expect(success).toBe(true);
    });
  });

  // ============================================================================
  // performSyncWithAutoScrape tests
  // ============================================================================

  describe("performSyncWithAutoScrape", () => {
    it("should sync new games and report success", async () => {
      const collection = {
        ...mockPrimaryCollection,
        autoScrapeNewGames: false, // Disable auto-scrape to simplify test
      };

      // Mock both findFirst (for getPrimaryCollection) and findUnique (for syncCollection with ID)
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(collection);
      vi.mocked(prisma.collection.findUnique).mockResolvedValue(collection);

      mockBggClient.getCollection.mockResolvedValue([
        { id: "1", name: "Game 1", yearPublished: 2020, isExpansion: false },
      ]);

      // Game is new
      vi.mocked(prisma.game.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.collectionGame.findUnique).mockResolvedValue(null);

      const result = await performSyncWithAutoScrape();

      expect(result.success).toBe(true);
      expect(result.created).toBe(1);
      expect(result.newGameIds).toContain("1");
    });
  });
});
