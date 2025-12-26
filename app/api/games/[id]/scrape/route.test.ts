import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import prisma from "@/lib/prisma";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    game: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

// Mock sync (to avoid Playwright)
vi.mock("@/lib/sync", () => ({
  scrapeGame: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";
import { scrapeGame } from "@/lib/sync";

describe("Game Scrape API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockParams = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  // ============================================================================
  // POST /api/games/[id]/scrape
  // ============================================================================

  describe("POST /api/games/[id]/scrape", () => {
    it("should return 403 when not admin", async () => {
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden"));

      const request = new NextRequest("http://localhost:3000/api/games/123/scrape", {
        method: "POST",
      });

      const response = await POST(request, createMockParams("123"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 404 when game not found", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
      });
      vi.mocked(prisma.game.findUnique).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/games/999/scrape", {
        method: "POST",
      });

      const response = await POST(request, createMockParams("999"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Game not found");
    });

    it("should scrape game successfully", async () => {
      const mockGame = {
        id: "123",
        name: "Wingspan",
        isExpansion: false,
      };
      const updatedGame = {
        ...mockGame,
        image: "https://example.com/scraped.jpg",
        rating: 8.1,
        lastScraped: new Date(),
      };

      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
      });
      vi.mocked(prisma.game.findUnique)
        .mockResolvedValueOnce(mockGame) // First call to check game exists
        .mockResolvedValueOnce(updatedGame); // Second call to get updated game
      vi.mocked(scrapeGame).mockResolvedValue(true);

      const request = new NextRequest("http://localhost:3000/api/games/123/scrape", {
        method: "POST",
      });

      const response = await POST(request, createMockParams("123"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(scrapeGame).toHaveBeenCalledWith("123");
    });

    it("should return 500 when scrape fails", async () => {
      const mockGame = {
        id: "123",
        name: "Wingspan",
        isExpansion: false,
      };

      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
      });
      vi.mocked(prisma.game.findUnique).mockResolvedValue(mockGame);
      vi.mocked(scrapeGame).mockResolvedValue(false);

      const request = new NextRequest("http://localhost:3000/api/games/123/scrape", {
        method: "POST",
      });

      const response = await POST(request, createMockParams("123"));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Scrape failed");
    });
  });
});
