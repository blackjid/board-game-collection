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

// Mock sync (to avoid Playwright)
vi.mock("@/lib/sync", () => ({
  scrapeGames: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";
import { scrapeGames } from "@/lib/sync";

describe("Scrape Active Games API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      expect(data.scraped).toBe(0);
    });

    it("should scrape all active games", async () => {
      const mockActiveGames = [
        { id: "1" },
        { id: "2" },
        { id: "3" },
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
      vi.mocked(scrapeGames).mockResolvedValue({
        success: true,
        scraped: 3,
        failed: 0,
      });

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Scraped 3 games, 0 failed");
      expect(data.scraped).toBe(3);
      expect(data.failed).toBe(0);
      expect(scrapeGames).toHaveBeenCalledWith(["1", "2", "3"]);
    });

    it("should report partial failures", async () => {
      const mockActiveGames = [
        { id: "1" },
        { id: "2" },
        { id: "3" },
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
      vi.mocked(scrapeGames).mockResolvedValue({
        success: true,
        scraped: 2,
        failed: 1,
      });

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Scraped 2 games, 1 failed");
      expect(data.scraped).toBe(2);
      expect(data.failed).toBe(1);
    });

    it("should query only active games", async () => {
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
        select: { id: true },
      });
    });
  });
});
