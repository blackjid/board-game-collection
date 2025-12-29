import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "./route";
import prisma from "@/lib/prisma";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    game: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";

describe("Game [id] API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockParams = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  const mockGame = {
    id: "123",
    name: "Wingspan",
    yearPublished: 2019,
    image: "https://example.com/wingspan.jpg",
    thumbnail: "https://example.com/wingspan-thumb.jpg",
    selectedThumbnail: null,
    description: "A bird-themed game",
    minPlayers: 1,
    maxPlayers: 5,
    minPlaytime: 40,
    maxPlaytime: 70,
    rating: 8.1,
    minAge: 10,
    categories: '["Card Game", "Animals"]',
    mechanics: '["Hand Management"]',
    isExpansion: false,
    isActive: true,
    lastScraped: new Date(),
    availableImages: '["img1.jpg"]',
    componentImages: '["comp1.jpg"]',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // ============================================================================
  // GET /api/games/[id]
  // ============================================================================

  describe("GET /api/games/[id]", () => {
    it("should return game by id", async () => {
      vi.mocked(prisma.game.findUnique).mockResolvedValue(mockGame);

      const request = new NextRequest("http://localhost:3000/api/games/123");
      const response = await GET(request, createMockParams("123"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.game.id).toBe("123");
      expect(data.game.name).toBe("Wingspan");
      expect(data.game.categories).toEqual(["Card Game", "Animals"]);
      expect(data.game.mechanics).toEqual(["Hand Management"]);
    });

    it("should return 404 when game not found", async () => {
      vi.mocked(prisma.game.findUnique).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/games/999");
      const response = await GET(request, createMockParams("999"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Game not found");
    });

    it("should parse JSON fields correctly", async () => {
      const gameWithNullFields = {
        ...mockGame,
        categories: null,
        mechanics: null,
        availableImages: null,
        componentImages: null,
      };
      vi.mocked(prisma.game.findUnique).mockResolvedValue(gameWithNullFields);

      const request = new NextRequest("http://localhost:3000/api/games/123");
      const response = await GET(request, createMockParams("123"));
      const data = await response.json();

      expect(data.game.categories).toEqual([]);
      expect(data.game.mechanics).toEqual([]);
      expect(data.game.availableImages).toEqual([]);
      expect(data.game.componentImages).toEqual([]);
    });
  });

  // ============================================================================
  // PATCH /api/games/[id]
  // ============================================================================

  describe("PATCH /api/games/[id]", () => {
    it("should return 403 when not admin", async () => {
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden"));

      const request = new NextRequest("http://localhost:3000/api/games/123", {
        method: "PATCH",
        body: JSON.stringify({ isActive: true }),
      });

      const response = await PATCH(request, createMockParams("123"));
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
        updatedAt: new Date(),
      });
      vi.mocked(prisma.game.findUnique).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/games/999", {
        method: "PATCH",
        body: JSON.stringify({ isActive: true }),
      });

      const response = await PATCH(request, createMockParams("999"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Game not found");
    });

    it("should update isActive to true", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.game.findUnique).mockResolvedValue(mockGame);
      vi.mocked(prisma.game.update).mockResolvedValue({
        ...mockGame,
        isActive: true,
      });

      const request = new NextRequest("http://localhost:3000/api/games/123", {
        method: "PATCH",
        body: JSON.stringify({ isActive: true }),
      });

      const response = await PATCH(request, createMockParams("123"));

      expect(response.status).toBe(200);
      expect(prisma.game.update).toHaveBeenCalledWith({
        where: { id: "123" },
        data: { isVisible: true },
      });
    });

    it("should update isActive to false", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.game.findUnique).mockResolvedValue(mockGame);
      vi.mocked(prisma.game.update).mockResolvedValue({
        ...mockGame,
        isActive: false,
      });

      const request = new NextRequest("http://localhost:3000/api/games/123", {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      });

      await PATCH(request, createMockParams("123"));

      expect(prisma.game.update).toHaveBeenCalledWith({
        where: { id: "123" },
        data: { isVisible: false },
      });
    });

    it("should ignore other fields", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.game.findUnique).mockResolvedValue(mockGame);
      vi.mocked(prisma.game.update).mockResolvedValue(mockGame);

      const request = new NextRequest("http://localhost:3000/api/games/123", {
        method: "PATCH",
        body: JSON.stringify({
          isActive: true,
          name: "Hacked Name",
          rating: 10,
        }),
      });

      await PATCH(request, createMockParams("123"));

      // Only isActive should be updated
      expect(prisma.game.update).toHaveBeenCalledWith({
        where: { id: "123" },
        data: { isVisible: true },
      });
    });
  });
});
