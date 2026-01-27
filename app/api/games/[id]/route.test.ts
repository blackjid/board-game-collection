import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "./route";
import prisma from "@/lib/prisma";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    game: {
      findUnique: vi.fn(),
    },
    collection: {
      findFirst: vi.fn(),
    },
    collectionGame: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
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
    baseGameId: null,
    lastScraped: new Date(),
    availableImages: '["img1.jpg"]',
    componentImages: '["comp1.jpg"]',
    createdAt: new Date(),
    updatedAt: new Date(),
    collections: [
      {
        collection: {
          id: "primary-collection",
          name: "My Collection",
          type: "bgg_sync",
          isPrimary: true,
        },
      },
    ],
    relationshipsTo: [],
  };

  // ============================================================================
  // GET /api/games/[id]
  // ============================================================================

  describe("GET /api/games/[id]", () => {
    it("should return game by id", async () => {
      vi.mocked(prisma.game.findUnique).mockResolvedValue(mockGame as never);

      const request = new NextRequest("http://localhost:3000/api/games/123");
      const response = await GET(request, createMockParams("123"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.game.id).toBe("123");
      expect(data.game.name).toBe("Wingspan");
      expect(data.game.categories).toEqual(["Card Game", "Animals"]);
      expect(data.game.mechanics).toEqual(["Hand Management"]);
      expect(data.game.isActive).toBe(true); // Has collections
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
      vi.mocked(prisma.game.findUnique).mockResolvedValue(gameWithNullFields as never);

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
    const mockPrimaryCollection = {
      id: "primary-collection",
      name: "My Collection",
      type: "bgg_sync",
      isPrimary: true,
    };

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

    it("should add game to primary collection when isActive=true", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.game.findUnique).mockResolvedValue(mockGame as never);
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(mockPrimaryCollection as never);
      vi.mocked(prisma.collectionGame.upsert).mockResolvedValue({} as never);

      const request = new NextRequest("http://localhost:3000/api/games/123", {
        method: "PATCH",
        body: JSON.stringify({ isActive: true }),
      });

      const response = await PATCH(request, createMockParams("123"));

      expect(response.status).toBe(200);
      expect(prisma.collectionGame.upsert).toHaveBeenCalledWith({
        where: {
          collectionId_gameId: {
            collectionId: "primary-collection",
            gameId: "123",
          },
        },
        create: {
          collectionId: "primary-collection",
          gameId: "123",
          addedBy: "manual",
        },
        update: {},
      });
    });

    it("should remove game from primary collection when isActive=false", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.game.findUnique).mockResolvedValue(mockGame as never);
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(mockPrimaryCollection as never);
      vi.mocked(prisma.collectionGame.deleteMany).mockResolvedValue({ count: 1 });

      const request = new NextRequest("http://localhost:3000/api/games/123", {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      });

      await PATCH(request, createMockParams("123"));

      expect(prisma.collectionGame.deleteMany).toHaveBeenCalledWith({
        where: {
          collectionId: "primary-collection",
          gameId: "123",
        },
      });
    });

    it("should not modify collection when isActive not provided", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.game.findUnique).mockResolvedValue(mockGame as never);

      const request = new NextRequest("http://localhost:3000/api/games/123", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Hacked Name",
          rating: 10,
        }),
      });

      await PATCH(request, createMockParams("123"));

      // Should not call collection methods when isActive not provided
      expect(prisma.collection.findFirst).not.toHaveBeenCalled();
      expect(prisma.collectionGame.upsert).not.toHaveBeenCalled();
      expect(prisma.collectionGame.deleteMany).not.toHaveBeenCalled();
    });
  });
});
