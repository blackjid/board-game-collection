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

describe("Game Preferences API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockParams = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  // ============================================================================
  // GET /api/games/[id]/preferences
  // ============================================================================

  describe("GET /api/games/[id]/preferences", () => {
    it("should return game preferences", async () => {
      vi.mocked(prisma.game.findUnique).mockResolvedValue({
        id: "123",
        name: "Test Game",
        yearPublished: 2020,
        image: "https://example.com/main.jpg",
        thumbnail: null,
        selectedThumbnail: "https://example.com/selected.jpg",
        description: null,
        minPlayers: null,
        maxPlayers: null,
        minPlaytime: null,
        maxPlaytime: null,
        rating: null,
        minAge: null,
        categories: null,
        mechanics: null,
        isExpansion: false,
        baseGameId: null,
        
        lastScraped: null,
        availableImages: '["img1.jpg", "img2.jpg", "img3.jpg"]',
        componentImages: '["comp1.jpg", "comp2.jpg"]',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/games/123/preferences");
      const response = await GET(request, createMockParams("123"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.gameId).toBe("123");
      expect(data.selectedThumbnail).toBe("https://example.com/selected.jpg");
      expect(data.componentImages).toEqual(["comp1.jpg", "comp2.jpg"]);
      expect(data.availableImages).toEqual(["img1.jpg", "img2.jpg", "img3.jpg"]);
      expect(data.defaultImage).toBe("https://example.com/main.jpg");
    });

    it("should return 404 when game not found", async () => {
      vi.mocked(prisma.game.findUnique).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/games/999/preferences");
      const response = await GET(request, createMockParams("999"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Game not found");
    });

    it("should handle null JSON fields", async () => {
      vi.mocked(prisma.game.findUnique).mockResolvedValue({
        id: "123",
        name: "Test Game",
        yearPublished: 2020,
        image: null,
        thumbnail: null,
        selectedThumbnail: null,
        description: null,
        minPlayers: null,
        maxPlayers: null,
        minPlaytime: null,
        maxPlaytime: null,
        rating: null,
        minAge: null,
        categories: null,
        mechanics: null,
        isExpansion: false,
        baseGameId: null,
        
        lastScraped: null,
        availableImages: null,
        componentImages: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/games/123/preferences");
      const response = await GET(request, createMockParams("123"));
      const data = await response.json();

      expect(data.selectedThumbnail).toBeNull();
      expect(data.componentImages).toEqual([]);
      expect(data.availableImages).toEqual([]);
      expect(data.defaultImage).toBeNull();
    });
  });

  // ============================================================================
  // PATCH /api/games/[id]/preferences
  // ============================================================================

  describe("PATCH /api/games/[id]/preferences", () => {
    it("should return 403 when not admin", async () => {
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden"));

      const request = new NextRequest("http://localhost:3000/api/games/123/preferences", {
        method: "PATCH",
        body: JSON.stringify({ selectedThumbnail: "new.jpg" }),
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

      const request = new NextRequest("http://localhost:3000/api/games/999/preferences", {
        method: "PATCH",
        body: JSON.stringify({ selectedThumbnail: "new.jpg" }),
      });

      const response = await PATCH(request, createMockParams("999"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Game not found");
    });

    it("should update selectedThumbnail", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.game.findUnique).mockResolvedValue({
        id: "123",
        name: "Test Game",
        yearPublished: 2020,
        image: null,
        thumbnail: null,
        selectedThumbnail: null,
        description: null,
        minPlayers: null,
        maxPlayers: null,
        minPlaytime: null,
        maxPlaytime: null,
        rating: null,
        minAge: null,
        categories: null,
        mechanics: null,
        isExpansion: false,
        baseGameId: null,
        
        lastScraped: null,
        availableImages: null,
        componentImages: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.game.update).mockResolvedValue({
        id: "123",
        name: "Test Game",
        yearPublished: 2020,
        image: null,
        thumbnail: null,
        selectedThumbnail: "https://example.com/new-thumb.jpg",
        description: null,
        minPlayers: null,
        maxPlayers: null,
        minPlaytime: null,
        maxPlaytime: null,
        rating: null,
        minAge: null,
        categories: null,
        mechanics: null,
        isExpansion: false,
        baseGameId: null,
        
        lastScraped: null,
        availableImages: null,
        componentImages: "[]",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/games/123/preferences", {
        method: "PATCH",
        body: JSON.stringify({ selectedThumbnail: "https://example.com/new-thumb.jpg" }),
      });

      const response = await PATCH(request, createMockParams("123"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.selectedThumbnail).toBe("https://example.com/new-thumb.jpg");
      expect(prisma.game.update).toHaveBeenCalledWith({
        where: { id: "123" },
        data: { selectedThumbnail: "https://example.com/new-thumb.jpg" },
      });
    });

    it("should update componentImages", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.game.findUnique).mockResolvedValue({
        id: "123",
        name: "Test Game",
        yearPublished: 2020,
        image: null,
        thumbnail: null,
        selectedThumbnail: null,
        description: null,
        minPlayers: null,
        maxPlayers: null,
        minPlaytime: null,
        maxPlaytime: null,
        rating: null,
        minAge: null,
        categories: null,
        mechanics: null,
        isExpansion: false,
        baseGameId: null,
        
        lastScraped: null,
        availableImages: null,
        componentImages: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.game.update).mockResolvedValue({
        id: "123",
        name: "Test Game",
        yearPublished: 2020,
        image: null,
        thumbnail: null,
        selectedThumbnail: null,
        description: null,
        minPlayers: null,
        maxPlayers: null,
        minPlaytime: null,
        maxPlaytime: null,
        rating: null,
        minAge: null,
        categories: null,
        mechanics: null,
        isExpansion: false,
        baseGameId: null,
        
        lastScraped: null,
        availableImages: null,
        componentImages: '["comp1.jpg", "comp2.jpg", "comp3.jpg"]',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/games/123/preferences", {
        method: "PATCH",
        body: JSON.stringify({ componentImages: ["comp1.jpg", "comp2.jpg", "comp3.jpg"] }),
      });

      const response = await PATCH(request, createMockParams("123"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.componentImages).toEqual(["comp1.jpg", "comp2.jpg", "comp3.jpg"]);
      expect(prisma.game.update).toHaveBeenCalledWith({
        where: { id: "123" },
        data: { componentImages: '["comp1.jpg","comp2.jpg","comp3.jpg"]' },
      });
    });

    it("should update both selectedThumbnail and componentImages", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.game.findUnique).mockResolvedValue({
        id: "123",
        name: "Test Game",
        yearPublished: 2020,
        image: null,
        thumbnail: null,
        selectedThumbnail: null,
        description: null,
        minPlayers: null,
        maxPlayers: null,
        minPlaytime: null,
        maxPlaytime: null,
        rating: null,
        minAge: null,
        categories: null,
        mechanics: null,
        isExpansion: false,
        baseGameId: null,
        
        lastScraped: null,
        availableImages: null,
        componentImages: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.game.update).mockResolvedValue({
        id: "123",
        name: "Test Game",
        yearPublished: 2020,
        image: null,
        thumbnail: null,
        selectedThumbnail: "thumb.jpg",
        description: null,
        minPlayers: null,
        maxPlayers: null,
        minPlaytime: null,
        maxPlaytime: null,
        rating: null,
        minAge: null,
        categories: null,
        mechanics: null,
        isExpansion: false,
        baseGameId: null,
        
        lastScraped: null,
        availableImages: null,
        componentImages: '["comp.jpg"]',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/games/123/preferences", {
        method: "PATCH",
        body: JSON.stringify({
          selectedThumbnail: "thumb.jpg",
          componentImages: ["comp.jpg"],
        }),
      });

      await PATCH(request, createMockParams("123"));

      expect(prisma.game.update).toHaveBeenCalledWith({
        where: { id: "123" },
        data: {
          selectedThumbnail: "thumb.jpg",
          componentImages: '["comp.jpg"]',
        },
      });
    });
  });
});
