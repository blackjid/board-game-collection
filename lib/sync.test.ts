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
  performSyncWithAutoScrape
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
  },
}));

// Mock Playwright using vi.hoisted
const mocks = vi.hoisted(() => {
  const page = {
    goto: vi.fn(),
    waitForSelector: vi.fn(),
    evaluate: vi.fn(),
    close: vi.fn(),
    $: vi.fn(),
    $$: vi.fn(),
  };
  return {
    page,
    launch: vi.fn(),
  };
});

vi.mock("playwright", () => {
  const browser = {
    newContext: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue(mocks.page),
    }),
    close: vi.fn(),
  };

  // Default behavior
  mocks.launch.mockResolvedValue(browser);

  return {
    chromium: {
      launch: mocks.launch,
    },
  };
});

// Mock scrape-queue
vi.mock("./scrape-queue", () => ({
  enqueueScrapeMany: vi.fn(),
}));

describe("lib/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();

    // Reset launch mock to default success case
    // We need to re-create the browser mock structure because mocking overwrites previous implementation
    const browser = {
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue(mocks.page),
      }),
      close: vi.fn(),
    };
    mocks.launch.mockResolvedValue(browser);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockPrimaryCollection = {
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
  };

  // ============================================================================
  // getPrimaryCollection tests
  // ============================================================================

  describe("getPrimaryCollection", () => {
    it("should return existing primary collection", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(mockPrimaryCollection);

      const collection = await getPrimaryCollection();

      expect(prisma.collection.findFirst).toHaveBeenCalledWith({
        where: { isPrimary: true },
      });
      expect(collection.id).toBe("col-1");
      expect(collection.name).toBe("Primary Collection");
    });

    it("should create primary collection if none exists", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.collection.create).mockResolvedValue({
        ...mockPrimaryCollection,
        id: "new-col",
        name: "My Collection",
        type: "manual",
        bggUsername: null,
      });

      const collection = await getPrimaryCollection();

      expect(prisma.collection.create).toHaveBeenCalledWith({
        data: {
          name: "My Collection",
          type: "manual",
          isPrimary: true,
        },
      });
      expect(collection.name).toBe("My Collection");
    });
  });

  // ============================================================================
  // getBggUsername tests
  // ============================================================================

  describe("getBggUsername", () => {
    it("should return the configured username from primary collection", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(mockPrimaryCollection);

      const username = await getBggUsername();
      expect(username).toBe("testuser");
    });

    it("should return empty string when primary collection has no username", async () => {
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
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(mockPrimaryCollection);

      const settings = await getSettings();

      expect(settings.bggUsername).toBe("testuser");
      expect(settings.collectionName).toBe("Primary Collection");
      expect(settings.syncSchedule).toBe("manual");
      expect(settings.autoScrapeNewGames).toBe(false);
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
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(mockPrimaryCollection);

      // Mock playwright evaluate to return scraped games
      mocks.page.evaluate.mockResolvedValue([
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
      expect(prisma.syncLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: "success", gamesFound: 2 })
      }));
    });

    it("should update existing games only if changed", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(mockPrimaryCollection);

      mocks.page.evaluate.mockResolvedValue([
        { id: "1", name: "Game 1 Updated", yearPublished: 2020, isExpansion: false },
      ]);

      // Mock DB: Game exists with different name
      vi.mocked(prisma.game.findUnique).mockResolvedValue({
        id: "1", name: "Game 1", yearPublished: 2020, isExpansion: false
      } as any);

      // Link exists
      vi.mocked(prisma.collectionGame.findUnique).mockResolvedValue({} as any);

      const result = await syncCollection();

      expect(result.success).toBe(true);
      expect(result.updated).toBe(1);
      expect(prisma.game.update).toHaveBeenCalled();
    });

    it("should handle sync failures gracefully", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(mockPrimaryCollection);

      mocks.page.goto.mockRejectedValue(new Error("Network error"));

      const result = await syncCollection();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
      expect(prisma.syncLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: "failed" })
      }));
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
        id: "123", name: "Test Game", isExpansion: false
      } as any);

      // Mock playwright for main image
      mocks.page.evaluate.mockResolvedValueOnce("http://example.com/image.jpg"); // First call for image

      // Mock fetch for extended data
      const mockGeekItem = {
        item: {
          description: "Test Description",
          minplayers: "2",
          maxplayers: "4",
          minplaytime: "30",
          maxplaytime: "60",
          minage: "12",
          links: {
            boardgamecategory: [{ name: "Strategy" }],
            boardgamemechanic: [{ name: "Dice" }],
          }
        }
      };

      const mockDynamicInfo = {
        item: { stats: { average: "8.5" } }
      };

      const mockGallery = {
        images: [{ imageurl_lg: "http://example.com/gallery.jpg" }]
      };

      (global.fetch as any)
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockGeekItem) })
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockDynamicInfo) })
        .mockResolvedValueOnce({ json: () => Promise.resolve(mockGallery) });

      const success = await scrapeGame("123");

      expect(success).toBe(true);
      expect(prisma.game.update).toHaveBeenCalledWith({
        where: { id: "123" },
        data: expect.objectContaining({
          description: "Test Description",
          rating: 8.5,
          minPlayers: 2,
          maxPlayers: 4,
          image: "http://example.com/image.jpg",
        })
      });
    });
  });

  // ============================================================================
  // performSyncWithAutoScrape tests
  // ============================================================================

  describe("performSyncWithAutoScrape", () => {
    it("should enqueue new games for scraping if auto-scrape enabled", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        ...mockPrimaryCollection,
        autoScrapeNewGames: true,
      });
      vi.mocked(prisma.collection.findUnique).mockResolvedValue({
        ...mockPrimaryCollection,
        autoScrapeNewGames: true,
      });

      // Mock syncCollection via module (or just rely on internal implementation mocking playwright)
      mocks.page.evaluate.mockResolvedValue([
        { id: "1", name: "Game 1", yearPublished: 2020, isExpansion: false },
      ]);

      // Game is new
      vi.mocked(prisma.game.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.game.findMany).mockResolvedValue([
        { id: "1", name: "Game 1" } as any
      ]);

      const result = await performSyncWithAutoScrape();

      expect(result.success).toBe(true);
      expect(result.autoScraped).toBe(1);
    });
  });

  // ============================================================================
  // stripHtml tests
  // ============================================================================

  describe("stripHtml", () => {
    it("should remove HTML tags", () => {
      const html = "<p>Hello <strong>World</strong></p>";
      expect(stripHtml(html)).toBe("Hello World");
    });

    it("should normalize whitespace", () => {
      const html = "Hello    World   Test";
      expect(stripHtml(html)).toBe("Hello World Test");
    });
  });
});
