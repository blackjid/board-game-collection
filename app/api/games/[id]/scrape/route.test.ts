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

// Mock scrape-queue (now uses async DB-backed queue)
vi.mock("@/lib/scrape-queue", () => ({
  enqueueScrape: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";
import { enqueueScrape } from "@/lib/scrape-queue";

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

    it("should queue scrape job successfully and return immediately", async () => {
      const mockGame = {
        id: "123",
        name: "Wingspan",
        isExpansion: false,
      };
      const mockJob = {
        id: "job-1",
        gameId: "123",
        gameName: "Wingspan",
        status: "pending" as const,
        createdAt: new Date(),
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
      vi.mocked(enqueueScrape).mockResolvedValue(mockJob);

      const request = new NextRequest("http://localhost:3000/api/games/123/scrape", {
        method: "POST",
      });

      const response = await POST(request, createMockParams("123"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Scrape job queued");
      expect(data.job.id).toBe("job-1");
      expect(data.job.gameId).toBe("123");
      expect(data.job.gameName).toBe("Wingspan");
      expect(data.job.status).toBe("pending");
      expect(enqueueScrape).toHaveBeenCalledWith("123", "Wingspan");
    });

    it("should return existing job if game is already in queue", async () => {
      const mockGame = {
        id: "123",
        name: "Wingspan",
        isExpansion: false,
      };
      const existingJob = {
        id: "existing-job",
        gameId: "123",
        gameName: "Wingspan",
        status: "processing" as const,
        createdAt: new Date(),
        startedAt: new Date(),
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
      // enqueueScrape returns existing job if already in queue
      vi.mocked(enqueueScrape).mockResolvedValue(existingJob);

      const request = new NextRequest("http://localhost:3000/api/games/123/scrape", {
        method: "POST",
      });

      const response = await POST(request, createMockParams("123"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.job.id).toBe("existing-job");
      expect(data.job.status).toBe("processing");
    });
  });
});
