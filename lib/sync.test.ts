import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import { isSyncDue, getSettings, getBggUsername, stripHtml } from "./sync";

// Mock the Prisma client
vi.mock("@/lib/prisma", () => ({
  default: {
    settings: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("lib/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // getBggUsername tests
  // ============================================================================

  describe("getBggUsername", () => {
    it("should return the configured username from settings", async () => {
      vi.mocked(prisma.settings.findUnique).mockResolvedValue({
        id: "default",
        bggUsername: "testuser",
        collectionName: null,
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        lastScheduledSync: null,
        updatedAt: new Date(),
      });

      const username = await getBggUsername();
      expect(username).toBe("testuser");
    });

    it("should return default username when settings don't exist", async () => {
      vi.mocked(prisma.settings.findUnique).mockResolvedValue(null);

      const username = await getBggUsername();
      expect(username).toBe(""); // Default username (empty)
    });

    it("should return default username when bggUsername is null", async () => {
      vi.mocked(prisma.settings.findUnique).mockResolvedValue({
        id: "default",
        bggUsername: null,
        collectionName: null,
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        lastScheduledSync: null,
        updatedAt: new Date(),
      });

      const username = await getBggUsername();
      expect(username).toBe("");
    });
  });

  // ============================================================================
  // getSettings tests
  // ============================================================================

  describe("getSettings", () => {
    it("should return existing settings", async () => {
      const mockSettings = {
        id: "default",
        bggUsername: "testuser",
        collectionName: "My Collection",
        syncSchedule: "daily",
        autoScrapeNewGames: true,
        lastScheduledSync: new Date("2024-01-01"),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.settings.findUnique).mockResolvedValue(mockSettings);

      const settings = await getSettings();
      expect(settings).toEqual(mockSettings);
      expect(prisma.settings.create).not.toHaveBeenCalled();
    });

    it("should create default settings when none exist", async () => {
      const newSettings = {
        id: "default",
        bggUsername: null,
        collectionName: null,
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        lastScheduledSync: null,
        updatedAt: new Date(),
      };

      vi.mocked(prisma.settings.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.settings.create).mockResolvedValue(newSettings);

      const settings = await getSettings();
      expect(prisma.settings.create).toHaveBeenCalledWith({
        data: { id: "default" },
      });
      expect(settings).toEqual(newSettings);
    });
  });

  // ============================================================================
  // isSyncDue tests
  // ============================================================================

  describe("isSyncDue", () => {
    it("should return false when syncSchedule is 'manual'", async () => {
      vi.mocked(prisma.settings.findUnique).mockResolvedValue({
        id: "default",
        bggUsername: null,
        collectionName: null,
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        lastScheduledSync: null,
        updatedAt: new Date(),
      });

      const result = await isSyncDue();
      expect(result).toBe(false);
    });

    it("should return true when never synced before", async () => {
      vi.mocked(prisma.settings.findUnique).mockResolvedValue({
        id: "default",
        bggUsername: null,
        collectionName: null,
        syncSchedule: "daily",
        autoScrapeNewGames: false,
        lastScheduledSync: null,
        updatedAt: new Date(),
      });

      const result = await isSyncDue();
      expect(result).toBe(true);
    });

    describe("daily schedule", () => {
      it("should return true when more than 24 hours have passed", async () => {
        const lastSync = new Date();
        lastSync.setHours(lastSync.getHours() - 25); // 25 hours ago

        vi.mocked(prisma.settings.findUnique).mockResolvedValue({
          id: "default",
          bggUsername: null,
          collectionName: null,
          syncSchedule: "daily",
          autoScrapeNewGames: false,
          lastScheduledSync: lastSync,
          updatedAt: new Date(),
        });

        const result = await isSyncDue();
        expect(result).toBe(true);
      });

      it("should return false when less than 24 hours have passed", async () => {
        const lastSync = new Date();
        lastSync.setHours(lastSync.getHours() - 12); // 12 hours ago

        vi.mocked(prisma.settings.findUnique).mockResolvedValue({
          id: "default",
          bggUsername: null,
          collectionName: null,
          syncSchedule: "daily",
          autoScrapeNewGames: false,
          lastScheduledSync: lastSync,
          updatedAt: new Date(),
        });

        const result = await isSyncDue();
        expect(result).toBe(false);
      });
    });

    describe("weekly schedule", () => {
      it("should return true when more than 7 days have passed", async () => {
        const lastSync = new Date();
        lastSync.setDate(lastSync.getDate() - 8); // 8 days ago

        vi.mocked(prisma.settings.findUnique).mockResolvedValue({
          id: "default",
          bggUsername: null,
          collectionName: null,
          syncSchedule: "weekly",
          autoScrapeNewGames: false,
          lastScheduledSync: lastSync,
          updatedAt: new Date(),
        });

        const result = await isSyncDue();
        expect(result).toBe(true);
      });

      it("should return false when less than 7 days have passed", async () => {
        const lastSync = new Date();
        lastSync.setDate(lastSync.getDate() - 3); // 3 days ago

        vi.mocked(prisma.settings.findUnique).mockResolvedValue({
          id: "default",
          bggUsername: null,
          collectionName: null,
          syncSchedule: "weekly",
          autoScrapeNewGames: false,
          lastScheduledSync: lastSync,
          updatedAt: new Date(),
        });

        const result = await isSyncDue();
        expect(result).toBe(false);
      });
    });

    describe("monthly schedule", () => {
      it("should return true when more than 30 days have passed", async () => {
        const lastSync = new Date();
        lastSync.setDate(lastSync.getDate() - 31); // 31 days ago

        vi.mocked(prisma.settings.findUnique).mockResolvedValue({
          id: "default",
          bggUsername: null,
          collectionName: null,
          syncSchedule: "monthly",
          autoScrapeNewGames: false,
          lastScheduledSync: lastSync,
          updatedAt: new Date(),
        });

        const result = await isSyncDue();
        expect(result).toBe(true);
      });

      it("should return false when less than 30 days have passed", async () => {
        const lastSync = new Date();
        lastSync.setDate(lastSync.getDate() - 15); // 15 days ago

        vi.mocked(prisma.settings.findUnique).mockResolvedValue({
          id: "default",
          bggUsername: null,
          collectionName: null,
          syncSchedule: "monthly",
          autoScrapeNewGames: false,
          lastScheduledSync: lastSync,
          updatedAt: new Date(),
        });

        const result = await isSyncDue();
        expect(result).toBe(false);
      });
    });

    it("should return false for unknown schedule type", async () => {
      vi.mocked(prisma.settings.findUnique).mockResolvedValue({
        id: "default",
        bggUsername: null,
        collectionName: null,
        syncSchedule: "unknown",
        autoScrapeNewGames: false,
        lastScheduledSync: new Date(),
        updatedAt: new Date(),
      });

      const result = await isSyncDue();
      expect(result).toBe(false);
    });
  });
});

// ============================================================================
// stripHtml tests
// ============================================================================

describe("stripHtml", () => {
  it("should strip simple HTML tags", () => {
    const result = stripHtml("<p>Hello World</p>");
    expect(result).toBe("Hello World");
  });

  it("should handle multiple tags", () => {
    const result = stripHtml("<div><p>Hello</p><span>World</span></div>");
    expect(result).toBe("Hello World");
  });

  it("should normalize whitespace", () => {
    const result = stripHtml("<p>Hello    World</p>");
    expect(result).toBe("Hello World");
  });

  it("should trim leading and trailing whitespace", () => {
    const result = stripHtml("  <p>Hello World</p>  ");
    expect(result).toBe("Hello World");
  });

  it("should handle tags with attributes", () => {
    const result = stripHtml('<a href="https://example.com" class="link">Click here</a>');
    expect(result).toBe("Click here");
  });

  it("should handle self-closing tags", () => {
    const result = stripHtml("Hello<br/>World");
    expect(result).toBe("Hello World");
  });

  it("should return empty string for empty input", () => {
    const result = stripHtml("");
    expect(result).toBe("");
  });

  it("should return original text if no HTML", () => {
    const result = stripHtml("Just plain text");
    expect(result).toBe("Just plain text");
  });

  it("should handle nested tags", () => {
    const result = stripHtml("<div><p><strong>Bold</strong> and <em>italic</em></p></div>");
    expect(result).toBe("Bold and italic");
  });

  it("should handle real-world BGG description excerpt", () => {
    const html = '<p>In <strong>Wingspan</strong>, you are bird enthusiasts&mdash;researchers, bird watchers, ornithologists, and collectors.</p>';
    const result = stripHtml(html);
    expect(result).toContain("Wingspan");
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });
});
