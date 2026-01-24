import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "./route";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/plays", () => ({
  getGamePlayById: vi.fn(),
  updateGamePlay: vi.fn(),
  deleteGamePlay: vi.fn(),
}));

import { requireAuth } from "@/lib/auth";
import { getGamePlayById, updateGamePlay, deleteGamePlay } from "@/lib/plays";

describe("app/api/plays/[id]/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockParams = { params: Promise.resolve({ id: "play1" }) };

  // ============================================================================
  // GET /api/plays/[id] - Get single play
  // ============================================================================

  describe("GET", () => {
    it("should return a play by id", async () => {
      const mockPlay = {
        id: "play1",
        gameId: "game1",
        loggedById: "user1",
        playedAt: "2026-01-01T00:00:00.000Z",
        location: "Home",
        duration: 90,
        notes: "Fun game",
        players: [{ id: "p1", name: "Alice", isWinner: true }],
      };

      vi.mocked(getGamePlayById).mockResolvedValue(mockPlay as any);

      const request = new NextRequest("http://localhost:3000/api/plays/play1");
      const response = await GET(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.play).toEqual(mockPlay);
      expect(getGamePlayById).toHaveBeenCalledWith("play1");
    });

    it("should return 404 if play not found", async () => {
      vi.mocked(getGamePlayById).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/plays/play1");
      const response = await GET(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Play not found");
    });

    it("should handle errors", async () => {
      vi.mocked(getGamePlayById).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/plays/play1");
      const response = await GET(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch play");
    });
  });

  // ============================================================================
  // PATCH /api/plays/[id] - Update play
  // ============================================================================

  describe("PATCH", () => {
    const mockUser = { id: "user1", email: "test@test.com", role: "user" };

    it("should update a play successfully", async () => {
      vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

      const updatedPlay = {
        id: "play1",
        gameId: "game1",
        loggedById: "user1",
        playedAt: "2026-01-01T00:00:00.000Z",
        location: "Cafe",
        duration: 120,
        notes: "Updated notes",
        players: [{ id: "p1", name: "Charlie", isWinner: true }],
      };

      vi.mocked(updateGamePlay).mockResolvedValue(updatedPlay as any);

      const request = new NextRequest("http://localhost:3000/api/plays/play1", {
        method: "PATCH",
        body: JSON.stringify({
          location: "Cafe",
          duration: 120,
          notes: "Updated notes",
          players: [{ name: "Charlie", isWinner: true }],
        }),
      });

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.play).toEqual(updatedPlay);
      expect(updateGamePlay).toHaveBeenCalledWith("play1", "user1", {
        location: "Cafe",
        duration: 120,
        notes: "Updated notes",
        players: [{ name: "Charlie", isWinner: true }],
      });
    });

    it("should require authentication", async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

      const request = new NextRequest("http://localhost:3000/api/plays/play1", {
        method: "PATCH",
        body: JSON.stringify({ location: "Cafe" }),
      });

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 if play not found", async () => {
      vi.mocked(requireAuth).mockResolvedValue(mockUser as any);
      vi.mocked(updateGamePlay).mockRejectedValue(new Error("Play not found"));

      const request = new NextRequest("http://localhost:3000/api/plays/play1", {
        method: "PATCH",
        body: JSON.stringify({ location: "Cafe" }),
      });

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Play not found");
    });

    it("should return 403 if user is not the owner", async () => {
      vi.mocked(requireAuth).mockResolvedValue(mockUser as any);
      vi.mocked(updateGamePlay).mockRejectedValue(
        new Error("Unauthorized: You can only edit your own plays")
      );

      const request = new NextRequest("http://localhost:3000/api/plays/play1", {
        method: "PATCH",
        body: JSON.stringify({ location: "Cafe" }),
      });

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Unauthorized: You can only edit your own plays");
    });

    it("should validate player names if players are provided", async () => {
      vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

      const request = new NextRequest("http://localhost:3000/api/plays/play1", {
        method: "PATCH",
        body: JSON.stringify({
          players: [{ name: "" }],
        }),
      });

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("All players must have a name");
    });

    it("should validate duration is positive", async () => {
      vi.mocked(requireAuth).mockResolvedValue(mockUser as any);

      const request = new NextRequest("http://localhost:3000/api/plays/play1", {
        method: "PATCH",
        body: JSON.stringify({ duration: -10 }),
      });

      const response = await PATCH(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Duration must be a positive number");
    });
  });

  // ============================================================================
  // DELETE /api/plays/[id] - Delete play
  // ============================================================================

  describe("DELETE", () => {
    const mockUser = { id: "user1", email: "test@test.com", role: "user" };

    it("should delete a play successfully", async () => {
      vi.mocked(requireAuth).mockResolvedValue(mockUser as any);
      vi.mocked(deleteGamePlay).mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost:3000/api/plays/play1", {
        method: "DELETE",
      });

      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(deleteGamePlay).toHaveBeenCalledWith("play1", "user1");
    });

    it("should require authentication", async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

      const request = new NextRequest("http://localhost:3000/api/plays/play1", {
        method: "DELETE",
      });

      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 if play not found", async () => {
      vi.mocked(requireAuth).mockResolvedValue(mockUser as any);
      vi.mocked(deleteGamePlay).mockRejectedValue(new Error("Play not found"));

      const request = new NextRequest("http://localhost:3000/api/plays/play1", {
        method: "DELETE",
      });

      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Play not found");
    });

    it("should return 403 if user is not the owner", async () => {
      vi.mocked(requireAuth).mockResolvedValue(mockUser as any);
      vi.mocked(deleteGamePlay).mockRejectedValue(
        new Error("Unauthorized: You can only delete your own plays")
      );

      const request = new NextRequest("http://localhost:3000/api/plays/play1", {
        method: "DELETE",
      });

      const response = await DELETE(request, mockParams);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Unauthorized: You can only delete your own plays");
    });
  });
});
