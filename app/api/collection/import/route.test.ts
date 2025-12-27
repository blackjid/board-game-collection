import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
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
  performSyncWithAutoScrape: vi.fn(),
  getBggUsername: vi.fn(),
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

import { getBggUsername, performSyncWithAutoScrape } from "@/lib/sync";
import { requireAdmin } from "@/lib/auth";

const mockAdminUser = {
  id: "admin-1",
  email: "admin@example.com",
  name: "Admin",
  role: "admin",
  passwordHash: "hash",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createRequest(body?: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/collection/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

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

  // ============================================================================
  // POST /api/collection/import (Sync Collection)
  // ============================================================================

  describe("POST /api/collection/import", () => {
    it("should return 403 when not admin", async () => {
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden"));

      const request = createRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should sync collection successfully with auto-scrape", async () => {
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(performSyncWithAutoScrape).mockResolvedValue({
        success: true,
        total: 50,
        created: 10,
        updated: 5,
        newGameIds: ["1", "2", "3"],
        autoScraped: 3,
        autoScrapeFailed: 0,
      });

      const request = createRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Sync complete: 10 new games, 5 updated");
      expect(data.total).toBe(50);
      expect(data.created).toBe(10);
      expect(data.updated).toBe(5);
      expect(data.autoScraped).toBe(3);
      expect(data.autoScrapeFailed).toBe(0);
      expect(performSyncWithAutoScrape).toHaveBeenCalledWith(false);
    });

    it("should pass skipAutoScrape=true when requested", async () => {
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(performSyncWithAutoScrape).mockResolvedValue({
        success: true,
        total: 50,
        created: 10,
        updated: 5,
        newGameIds: ["1", "2", "3"],
        autoScraped: 0,
        autoScrapeFailed: 0,
      });

      const request = createRequest({ skipAutoScrape: true });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.autoScraped).toBe(0);
      expect(performSyncWithAutoScrape).toHaveBeenCalledWith(true);
    });

    it("should default skipAutoScrape to false when not provided", async () => {
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(performSyncWithAutoScrape).mockResolvedValue({
        success: true,
        total: 50,
        created: 10,
        updated: 5,
        newGameIds: ["1", "2", "3"],
        autoScraped: 3,
        autoScrapeFailed: 0,
      });

      const request = createRequest({});
      await POST(request);

      expect(performSyncWithAutoScrape).toHaveBeenCalledWith(false);
    });

    it("should return 500 when sync fails", async () => {
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(performSyncWithAutoScrape).mockResolvedValue({
        success: false,
        total: 0,
        created: 0,
        updated: 0,
        newGameIds: [],
        autoScraped: 0,
        autoScrapeFailed: 0,
        error: "Failed to fetch collection from BGG",
      });

      const request = createRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to fetch collection from BGG");
    });

    it("should handle zero updates", async () => {
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(performSyncWithAutoScrape).mockResolvedValue({
        success: true,
        total: 100,
        created: 0,
        updated: 0,
        newGameIds: [],
        autoScraped: 0,
        autoScrapeFailed: 0,
      });

      const request = createRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Sync complete: 0 new games, 0 updated");
    });

    it("should report auto-scrape failures", async () => {
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(performSyncWithAutoScrape).mockResolvedValue({
        success: true,
        total: 50,
        created: 5,
        updated: 0,
        newGameIds: ["1", "2", "3", "4", "5"],
        autoScraped: 3,
        autoScrapeFailed: 2,
      });

      const request = createRequest();
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.autoScraped).toBe(3);
      expect(data.autoScrapeFailed).toBe(2);
    });
  });
});
