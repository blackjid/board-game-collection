import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import prisma from "@/lib/prisma";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    syncLog: {
      findFirst: vi.fn(),
    },
    game: {
      count: vi.fn(),
    },
    settings: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock sync module
vi.mock("@/lib/sync", () => ({
  syncCollection: vi.fn(),
  getBggUsername: vi.fn(),
}));

import { getBggUsername } from "@/lib/sync";

describe("Collection Import API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET /api/collection/import (Sync Status)
  // ============================================================================

  describe("GET /api/collection/import", () => {
    it("should return sync status with last sync info", async () => {
      const lastSyncDate = new Date("2024-01-15T10:00:00Z");

      vi.mocked(prisma.syncLog.findFirst).mockResolvedValue({
        id: "sync-1",
        syncedAt: lastSyncDate,
        gamesFound: 42,
        status: "success",
        username: "testuser",
      });

      // Mock the count calls in order
      vi.mocked(prisma.game.count)
        .mockResolvedValueOnce(100)  // total games
        .mockResolvedValueOnce(50)   // active games
        .mockResolvedValueOnce(45)   // scraped games
        .mockResolvedValueOnce(5);   // unscraped active games

      vi.mocked(getBggUsername).mockResolvedValue("testuser");

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      // The route returns the entire lastSync object from the database
      expect(data.lastSync).toMatchObject({
        gamesFound: 42,
        status: "success",
      });
      expect(data.lastSync.syncedAt).toBe(lastSyncDate.toISOString());
      expect(data.bggUsername).toBe("testuser");
      expect(data.stats).toEqual({
        total: 100,
        active: 50,
        scraped: 45,
        unscrapedActive: 5,
      });
    });

    it("should return null lastSync when no syncs exist", async () => {
      vi.mocked(prisma.syncLog.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.game.count)
        .mockResolvedValueOnce(0)  // total games
        .mockResolvedValueOnce(0)  // active games
        .mockResolvedValueOnce(0)  // scraped games
        .mockResolvedValueOnce(0); // unscraped active games

      vi.mocked(getBggUsername).mockResolvedValue("testuser");

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.lastSync).toBeNull();
    });

    it("should correctly identify unscraped active games", async () => {
      vi.mocked(prisma.syncLog.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.game.count)
        .mockResolvedValueOnce(10)  // total games
        .mockResolvedValueOnce(8)   // active games
        .mockResolvedValueOnce(5)   // scraped games (some active aren't scraped)
        .mockResolvedValueOnce(3);  // unscraped active games

      vi.mocked(getBggUsername).mockResolvedValue("testuser");

      const response = await GET();
      const data = await response.json();

      expect(data.stats.unscrapedActive).toBe(3);
    });

    it("should return zero unscraped when all active games are scraped", async () => {
      vi.mocked(prisma.syncLog.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.game.count)
        .mockResolvedValueOnce(20)  // total games
        .mockResolvedValueOnce(15)  // active games
        .mockResolvedValueOnce(15)  // scraped games (all active are scraped)
        .mockResolvedValueOnce(0);  // unscraped active games

      vi.mocked(getBggUsername).mockResolvedValue("testuser");

      const response = await GET();
      const data = await response.json();

      expect(data.stats.unscrapedActive).toBe(0);
    });
  });
});
