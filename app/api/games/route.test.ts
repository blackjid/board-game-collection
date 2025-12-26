import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import prisma from "@/lib/prisma";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    game: {
      findMany: vi.fn(),
    },
  },
}));

describe("Games API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET /api/games
  // ============================================================================

  describe("GET /api/games", () => {
    const mockGames = [
      {
        id: "1",
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
        mechanics: '["Hand Management", "Engine Building"]',
        isExpansion: false,
        isActive: true,
        lastScraped: new Date(),
        availableImages: '["img1.jpg", "img2.jpg"]',
        componentImages: "[]",
      },
      {
        id: "2",
        name: "Catan",
        yearPublished: 1995,
        image: "https://example.com/catan.jpg",
        thumbnail: null,
        selectedThumbnail: null,
        description: "Trade and build",
        minPlayers: 3,
        maxPlayers: 4,
        minPlaytime: 60,
        maxPlaytime: 120,
        rating: 7.2,
        minAge: 10,
        categories: null,
        mechanics: null,
        isExpansion: false,
        isActive: false,
        lastScraped: null,
        availableImages: null,
        componentImages: null,
      },
    ];

    it("should return all games", async () => {
      vi.mocked(prisma.game.findMany).mockResolvedValue(mockGames);

      const request = new NextRequest("http://localhost:3000/api/games");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.games).toHaveLength(2);
      expect(data.games[0].name).toBe("Wingspan");
      expect(data.games[0].categories).toEqual(["Card Game", "Animals"]);
      expect(data.games[0].mechanics).toEqual(["Hand Management", "Engine Building"]);
    });

    it("should filter active games when active=true", async () => {
      vi.mocked(prisma.game.findMany).mockResolvedValue([mockGames[0]]);

      const request = new NextRequest("http://localhost:3000/api/games?active=true");
      const response = await GET(request);

      expect(prisma.game.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
    });

    it("should filter scraped games when scraped=true", async () => {
      vi.mocked(prisma.game.findMany).mockResolvedValue([mockGames[0]]);

      const request = new NextRequest("http://localhost:3000/api/games?scraped=true");
      const response = await GET(request);

      expect(prisma.game.findMany).toHaveBeenCalledWith({
        where: { lastScraped: { not: null } },
        orderBy: { name: "asc" },
      });
    });

    it("should combine filters when both active=true and scraped=true", async () => {
      vi.mocked(prisma.game.findMany).mockResolvedValue([mockGames[0]]);

      const request = new NextRequest("http://localhost:3000/api/games?active=true&scraped=true");
      const response = await GET(request);

      expect(prisma.game.findMany).toHaveBeenCalledWith({
        where: { isActive: true, lastScraped: { not: null } },
        orderBy: { name: "asc" },
      });
    });

    it("should parse JSON fields correctly", async () => {
      vi.mocked(prisma.game.findMany).mockResolvedValue(mockGames);

      const request = new NextRequest("http://localhost:3000/api/games");
      const response = await GET(request);
      const data = await response.json();

      // First game has JSON data
      expect(data.games[0].categories).toEqual(["Card Game", "Animals"]);
      expect(data.games[0].availableImages).toEqual(["img1.jpg", "img2.jpg"]);

      // Second game has null JSON fields
      expect(data.games[1].categories).toEqual([]);
      expect(data.games[1].mechanics).toEqual([]);
      expect(data.games[1].availableImages).toEqual([]);
    });

    it("should return empty array when no games exist", async () => {
      vi.mocked(prisma.game.findMany).mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/games");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.games).toEqual([]);
    });
  });
});
