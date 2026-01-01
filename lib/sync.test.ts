import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import { isSyncDue, getSettings, getBggUsername, stripHtml, getPrimaryCollection } from "./sync";

// Mock the Prisma client
vi.mock("@/lib/prisma", () => ({
  default: {
    collection: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("lib/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    it("should create collection and return empty when none exists", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.collection.create).mockResolvedValue({
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

    it("should create collection when none exists and return defaults", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.collection.create).mockResolvedValue({
        ...mockPrimaryCollection,
        name: "My Collection",
        bggUsername: null,
      });

      const settings = await getSettings();

      expect(settings.collectionName).toBe("My Collection");
      expect(settings.bggUsername).toBeNull();
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

    it("should return false for daily when last sync was 1 hour ago", async () => {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        ...mockPrimaryCollection,
        syncSchedule: "daily",
        lastSyncedAt: oneHourAgo,
      });

      const isDue = await isSyncDue();
      expect(isDue).toBe(false);
    });

    it("should return true for weekly when last sync was 8 days ago", async () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        ...mockPrimaryCollection,
        syncSchedule: "weekly",
        lastSyncedAt: eightDaysAgo,
      });

      const isDue = await isSyncDue();
      expect(isDue).toBe(true);
    });

    it("should return false for weekly when last sync was 3 days ago", async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        ...mockPrimaryCollection,
        syncSchedule: "weekly",
        lastSyncedAt: threeDaysAgo,
      });

      const isDue = await isSyncDue();
      expect(isDue).toBe(false);
    });

    it("should return true for monthly when last sync was 31 days ago", async () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        ...mockPrimaryCollection,
        syncSchedule: "monthly",
        lastSyncedAt: thirtyOneDaysAgo,
      });

      const isDue = await isSyncDue();
      expect(isDue).toBe(true);
    });

    it("should return false for monthly when last sync was 15 days ago", async () => {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        ...mockPrimaryCollection,
        syncSchedule: "monthly",
        lastSyncedAt: fifteenDaysAgo,
      });

      const isDue = await isSyncDue();
      expect(isDue).toBe(false);
    });
  });

  // ============================================================================
  // stripHtml tests (utility function)
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

    it("should handle empty string", () => {
      expect(stripHtml("")).toBe("");
    });

    it("should handle text without HTML", () => {
      expect(stripHtml("Plain text")).toBe("Plain text");
    });
  });
});
