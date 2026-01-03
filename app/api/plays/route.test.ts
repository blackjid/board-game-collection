import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/plays", () => ({
  createGamePlay: vi.fn(),
  listGamePlays: vi.fn(),
}));

import { requireAuth } from "@/lib/auth";
import { createGamePlay, listGamePlays } from "@/lib/plays";

describe("app/api/plays/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET /api/plays - List plays
  // ============================================================================

  describe("GET", () => {
    it("should list all plays without filters", async () => {
      const mockPlays = [
        {
          id: "play1",
          gameId: "game1",
          loggedById: "user1",
          playedAt: "2026-01-01T00:00:00.000Z",
          location: "Home",
          duration: 90,
          notes: "Fun game",
          players: [{ id: "p1", name: "Alice", isWinner: true, isNew: false }],
        },
      ];

      vi.mocked(listGamePlays).mockResolvedValue(mockPlays as any);

      const request = new NextRequest("http://localhost:3000/api/plays");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.plays).toEqual(mockPlays);
      expect(listGamePlays).toHaveBeenCalledWith({
        gameId: undefined,
        userId: undefined,
        limit: undefined,
      });
    });

    it("should list plays filtered by gameId", async () => {
      const mockPlays = [
        {
          id: "play1",
          gameId: "game1",
          loggedById: "user1",
          playedAt: "2026-01-01T00:00:00.000Z",
          location: "Home",
          duration: 90,
          notes: null,
          players: [],
        },
      ];

      vi.mocked(listGamePlays).mockResolvedValue(mockPlays as any);

      const request = new NextRequest(
        "http://localhost:3000/api/plays?gameId=game1"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(listGamePlays).toHaveBeenCalledWith({
        gameId: "game1",
        userId: undefined,
        limit: undefined,
      });
    });

    it("should list plays filtered by userId and limit", async () => {
      vi.mocked(listGamePlays).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost:3000/api/plays?userId=user1&limit=10"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(listGamePlays).toHaveBeenCalledWith({
        gameId: undefined,
        userId: "user1",
        limit: 10,
      });
    });

    it("should handle errors", async () => {
      vi.mocked(listGamePlays).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/plays");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to list plays");
    });
  });

  // ============================================================================
  // POST /api/plays - Create play
  // ============================================================================

  describe("POST", () => {
    const mockUser = { id: "user1", email: "test@test.com", role: "user" };

    it("should create a play successfully", async () => {
      vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

      const mockPlay = {
        id: "play1",
        gameId: "game1",
        loggedById: "user1",
        playedAt: "2026-01-03T00:00:00.000Z",
        location: "Home",
        duration: 90,
        notes: "Great game",
        players: [
          { id: "p1", name: "Alice", isWinner: true, isNew: false },
          { id: "p2", name: "Bob", isWinner: false, isNew: true },
        ],
      };

      vi.mocked(createGamePlay).mockResolvedValue(mockPlay as any);

      const request = new NextRequest("http://localhost:3000/api/plays", {
        method: "POST",
        body: JSON.stringify({
          gameId: "game1",
          playedAt: "2026-01-03T15:00:00Z",
          location: "Home",
          duration: 90,
          notes: "Great game",
          players: [
            { name: "Alice", isWinner: true, isNew: false },
            { name: "Bob", isWinner: false, isNew: true },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.play).toEqual(mockPlay);
      expect(createGamePlay).toHaveBeenCalledWith("user1", {
        gameId: "game1",
        playedAt: "2026-01-03T15:00:00Z",
        location: "Home",
        duration: 90,
        notes: "Great game",
        players: [
          { name: "Alice", isWinner: true, isNew: false },
          { name: "Bob", isWinner: false, isNew: true },
        ],
      });
    });

    it("should require authentication", async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

      const request = new NextRequest("http://localhost:3000/api/plays", {
        method: "POST",
        body: JSON.stringify({
          gameId: "game1",
          players: [{ name: "Alice" }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should validate gameId is required", async () => {
      vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

      const request = new NextRequest("http://localhost:3000/api/plays", {
        method: "POST",
        body: JSON.stringify({
          players: [{ name: "Alice" }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("gameId is required");
    });

    it("should validate at least one player is required", async () => {
      vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

      const request = new NextRequest("http://localhost:3000/api/plays", {
        method: "POST",
        body: JSON.stringify({
          gameId: "game1",
          players: [],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("At least one player is required");
    });

    it("should validate player names are not empty", async () => {
      vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

      const request = new NextRequest("http://localhost:3000/api/plays", {
        method: "POST",
        body: JSON.stringify({
          gameId: "game1",
          players: [{ name: "" }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("All players must have a name");
    });

    it("should validate duration is positive", async () => {
      vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

      const request = new NextRequest("http://localhost:3000/api/plays", {
        method: "POST",
        body: JSON.stringify({
          gameId: "game1",
          duration: -10,
          players: [{ name: "Alice" }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Duration must be a positive number");
    });

    it("should handle database errors", async () => {
      vi.mocked(requireAuth).mockResolvedValue(mockUser as any);
      vi.mocked(createGamePlay).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/plays", {
        method: "POST",
        body: JSON.stringify({
          gameId: "game1",
          players: [{ name: "Alice" }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create play");
    });
  });
});
