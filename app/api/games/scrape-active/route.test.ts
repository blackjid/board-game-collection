import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import prisma from "@/lib/prisma";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    game: {
      findMany: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

// Mock scrape-queue (now uses async DB-backed queue)
vi.mock("@/lib/scrape-queue", () => ({
  enqueueScrapeMany: vi.fn(),
  getQueueStatus: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";
import { enqueueScrapeMany, getQueueStatus } from "@/lib/scrape-queue";

describe("Scrape Active Games API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getQueueStatus).mockResolvedValue({
      isProcessing: true,
      currentJob: null,
      pendingCount: 0,
      completedCount: 0,
      failedCount: 0,
      recentJobs: [],
    });
  });

  // ============================================================================
  // POST /api/games/scrape-active
  // ============================================================================

  describe("POST /api/games/scrape-active", () => {
    it("should return 403 when not admin", async () => {
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden"));

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return success message when no active games", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
      });
      vi.mocked(prisma.game.findMany).mockResolvedValue([]);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("No active games to scrape");
      expect(data.queued).toBe(0);
    });

    it("should queue all active games for scraping", async () => {
      const mockActiveGames = [
        { id: "1", name: "Game One" },
        { id: "2", name: "Game Two" },
        { id: "3", name: "Game Three" },
      ];
      const mockJobs = [
        { id: "job-1", gameId: "1", gameName: "Game One", status: "pending" as const, createdAt: new Date() },
        { id: "job-2", gameId: "2", gameName: "Game Two", status: "pending" as const, createdAt: new Date() },
        { id: "job-3", gameId: "3", gameName: "Game Three", status: "pending" as const, createdAt: new Date() },
      ];

      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
      });
      vi.mocked(prisma.game.findMany).mockResolvedValue(mockActiveGames);
      vi.mocked(enqueueScrapeMany).mockResolvedValue(mockJobs);
      vi.mocked(getQueueStatus).mockResolvedValue({
        isProcessing: true,
        currentJob: mockJobs[0],
        pendingCount: 2,
        completedCount: 0,
        failedCount: 0,
        recentJobs: mockJobs,
      });

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Queued 3 games for scraping");
      expect(data.queued).toBe(3);
      expect(data.queueStatus.isProcessing).toBe(true);
      expect(data.queueStatus.pendingCount).toBe(2);
      expect(enqueueScrapeMany).toHaveBeenCalledWith([
        { id: "1", name: "Game One" },
        { id: "2", name: "Game Two" },
        { id: "3", name: "Game Three" },
      ]);
    });

    it("should query only active games with id and name", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
      });
      vi.mocked(prisma.game.findMany).mockResolvedValue([]);

      await POST();

      expect(prisma.game.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: { id: true, name: true },
      });
    });

    it("should return immediately without waiting for scraping to complete", async () => {
      const mockActiveGames = [
        { id: "1", name: "Game One" },
      ];
      const mockJobs = [
        { id: "job-1", gameId: "1", gameName: "Game One", status: "pending" as const, createdAt: new Date() },
      ];

      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
      });
      vi.mocked(prisma.game.findMany).mockResolvedValue(mockActiveGames);
      vi.mocked(enqueueScrapeMany).mockResolvedValue(mockJobs);

      const startTime = Date.now();
      const response = await POST();
      const elapsed = Date.now() - startTime;

      // Should return immediately (< 100ms) since it just queues
      expect(elapsed).toBeLessThan(100);
      expect(response.status).toBe(200);
    });
  });
});
