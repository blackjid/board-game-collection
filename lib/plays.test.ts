import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "./prisma";

import {
  createGamePlay,
  getGamePlayById,
  listGamePlays,
  updateGamePlay,
  deleteGamePlay,
  getPlayCountForGame,
  getPlayCountForUser,
} from "./plays";

describe("lib/plays", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockGame = {
    id: "game1",
    name: "Test Game",
    thumbnail: "https://example.com/thumb.jpg",
  };

  const mockUser = {
    id: "user1",
    name: "Test User",
    email: "test@test.com",
  };

  // ============================================================================
  // createGamePlay
  // ============================================================================

  describe("createGamePlay", () => {
    it("should create a play with all fields", async () => {
      const mockPrismaPlay = {
        id: "play1",
        gameId: "game1",
        loggedById: "user1",
        playedAt: new Date("2026-01-03"),
        location: "Home",
        duration: 90,
        notes: "Great game",
        createdAt: new Date(),
        updatedAt: new Date(),
        players: [
          {
            id: "p1",
            name: "Alice",
            isWinner: true,
            playId: "play1",
            createdAt: new Date(),
          },
          {
            id: "p2",
            name: "Bob",
            isWinner: false,
            playId: "play1",
            createdAt: new Date(),
          },
        ],
        game: mockGame,
        loggedBy: mockUser,
      };

      vi.mocked(prisma.gamePlay.create).mockResolvedValue(mockPrismaPlay as any);

      const result = await createGamePlay("user1", {
        gameId: "game1",
        playedAt: "2026-01-03T15:00:00Z",
        location: "Home",
        duration: 90,
        notes: "Great game",
        players: [
          { name: "Alice", isWinner: true },
          { name: "Bob", isWinner: false },
        ],
      });

      expect(result.id).toBe("play1");
      expect(result.gameId).toBe("game1");
      expect(result.players).toHaveLength(2);
      expect(result.players[0].name).toBe("Alice");
      expect(result.players[0].isWinner).toBe(true);
      expect(result.game?.name).toBe("Test Game");
      expect(result.loggedBy?.name).toBe("Test User");

      expect(prisma.gamePlay.create).toHaveBeenCalledWith({
        data: {
          gameId: "game1",
          loggedById: "user1",
          playedAt: new Date("2026-01-03T15:00:00Z"),
          location: "Home",
          duration: 90,
          notes: "Great game",
          players: {
            create: [
              { name: "Alice", playerId: null, isWinner: true },
              { name: "Bob", playerId: null, isWinner: false },
            ],
          },
        },
        include: {
          players: true,
          game: { select: { id: true, name: true, thumbnail: true } },
          loggedBy: { select: { id: true, name: true, email: true } },
        },
      });
    });

    it("should use defaults for optional fields", async () => {
      const mockPrismaPlay = {
        id: "play1",
        gameId: "game1",
        loggedById: "user1",
        playedAt: expect.any(Date),
        location: null,
        duration: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        players: [
          {
            id: "p1",
            name: "Alice",
            isWinner: false,
            playId: "play1",
            createdAt: new Date(),
          },
        ],
        game: mockGame,
        loggedBy: mockUser,
      };

      vi.mocked(prisma.gamePlay.create).mockResolvedValue(mockPrismaPlay as any);

      const result = await createGamePlay("user1", {
        gameId: "game1",
        players: [{ name: "Alice" }],
      });

      expect(result.location).toBeNull();
      expect(result.duration).toBeNull();
      expect(result.notes).toBeNull();
      expect(result.players[0].isWinner).toBe(false);
    });
  });

  // ============================================================================
  // getGamePlayById
  // ============================================================================

  describe("getGamePlayById", () => {
    it("should return a play by id", async () => {
      const mockPrismaPlay = {
        id: "play1",
        gameId: "game1",
        loggedById: "user1",
        playedAt: new Date("2026-01-03"),
        location: "Home",
        duration: 90,
        notes: "Great game",
        createdAt: new Date(),
        updatedAt: new Date(),
        players: [],
        game: mockGame,
        loggedBy: mockUser,
      };

      vi.mocked(prisma.gamePlay.findUnique).mockResolvedValue(mockPrismaPlay as any);

      const result = await getGamePlayById("play1");

      expect(result).toBeDefined();
      expect(result?.id).toBe("play1");
      expect(prisma.gamePlay.findUnique).toHaveBeenCalledWith({
        where: { id: "play1" },
        include: {
          players: true,
          game: { select: { id: true, name: true, thumbnail: true } },
          loggedBy: { select: { id: true, name: true, email: true } },
        },
      });
    });

    it("should return null if play not found", async () => {
      vi.mocked(prisma.gamePlay.findUnique).mockResolvedValue(null);

      const result = await getGamePlayById("nonexistent");

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // listGamePlays
  // ============================================================================

  describe("listGamePlays", () => {
    it("should list all plays without filters", async () => {
      const mockPlays = [
        {
          id: "play1",
          gameId: "game1",
          loggedById: "user1",
          playedAt: new Date("2026-01-03"),
          location: null,
          duration: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          players: [],
          game: mockGame,
          loggedBy: mockUser,
        },
      ];

      vi.mocked(prisma.gamePlay.findMany).mockResolvedValue(mockPlays as any);

      const result = await listGamePlays();

      expect(result).toHaveLength(1);
      expect(prisma.gamePlay.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          players: true,
          game: { select: { id: true, name: true, thumbnail: true } },
          loggedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { playedAt: "desc" },
        take: 100,
      });
    });

    it("should filter by gameId", async () => {
      vi.mocked(prisma.gamePlay.findMany).mockResolvedValue([]);

      await listGamePlays({ gameId: "game1" });

      expect(prisma.gamePlay.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { gameId: "game1" },
        })
      );
    });

    it("should filter by userId and apply limit", async () => {
      vi.mocked(prisma.gamePlay.findMany).mockResolvedValue([]);

      await listGamePlays({ userId: "user1", limit: 10 });

      expect(prisma.gamePlay.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { loggedById: "user1" },
          take: 10,
        })
      );
    });
  });

  // ============================================================================
  // updateGamePlay
  // ============================================================================

  describe("updateGamePlay", () => {
    it("should update a play", async () => {
      const existingPlay = {
        id: "play1",
        loggedById: "user1",
      };

      const updatedPlay = {
        id: "play1",
        gameId: "game1",
        loggedById: "user1",
        playedAt: new Date("2026-01-03"),
        location: "Cafe",
        duration: 120,
        notes: "Updated",
        createdAt: new Date(),
        updatedAt: new Date(),
        players: [],
        game: mockGame,
        loggedBy: mockUser,
      };

      vi.mocked(prisma.gamePlay.findUnique).mockResolvedValue(existingPlay as any);
      vi.mocked(prisma.gamePlay.update).mockResolvedValue(updatedPlay as any);

      const result = await updateGamePlay("play1", "user1", {
        location: "Cafe",
        duration: 120,
        notes: "Updated",
      });

      expect(result.location).toBe("Cafe");
      expect(result.duration).toBe(120);
    });

    it("should throw if play not found", async () => {
      vi.mocked(prisma.gamePlay.findUnique).mockResolvedValue(null);

      await expect(
        updateGamePlay("play1", "user1", { location: "Cafe" })
      ).rejects.toThrow("Play not found");
    });

    it("should throw if user is not the owner", async () => {
      const existingPlay = {
        id: "play1",
        loggedById: "user1",
      };

      vi.mocked(prisma.gamePlay.findUnique).mockResolvedValue(existingPlay as any);

      await expect(
        updateGamePlay("play1", "user2", { location: "Cafe" })
      ).rejects.toThrow("Unauthorized: You can only edit your own plays");
    });

    it("should delete and recreate players if players are provided", async () => {
      const existingPlay = {
        id: "play1",
        loggedById: "user1",
      };

      const updatedPlay = {
        id: "play1",
        gameId: "game1",
        loggedById: "user1",
        playedAt: new Date(),
        location: null,
        duration: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        players: [
          {
            id: "p1",
            name: "Charlie",
            isWinner: true,
            playId: "play1",
            createdAt: new Date(),
          },
        ],
        game: mockGame,
        loggedBy: mockUser,
      };

      vi.mocked(prisma.gamePlay.findUnique).mockResolvedValue(existingPlay as any);
      vi.mocked(prisma.gamePlayPlayer.deleteMany).mockResolvedValue({ count: 2 } as any);
      vi.mocked(prisma.gamePlay.update).mockResolvedValue(updatedPlay as any);

      await updateGamePlay("play1", "user1", {
        players: [{ name: "Charlie", isWinner: true }],
      });

      expect(prisma.gamePlayPlayer.deleteMany).toHaveBeenCalledWith({
        where: { playId: "play1" },
      });
    });
  });

  // ============================================================================
  // deleteGamePlay
  // ============================================================================

  describe("deleteGamePlay", () => {
    it("should delete a play", async () => {
      const existingPlay = {
        id: "play1",
        loggedById: "user1",
      };

      vi.mocked(prisma.gamePlay.findUnique).mockResolvedValue(existingPlay as any);
      vi.mocked(prisma.gamePlay.delete).mockResolvedValue({} as any);

      await deleteGamePlay("play1", "user1");

      expect(prisma.gamePlay.delete).toHaveBeenCalledWith({
        where: { id: "play1" },
      });
    });

    it("should throw if play not found", async () => {
      vi.mocked(prisma.gamePlay.findUnique).mockResolvedValue(null);

      await expect(deleteGamePlay("play1", "user1")).rejects.toThrow(
        "Play not found"
      );
    });

    it("should throw if user is not the owner", async () => {
      const existingPlay = {
        id: "play1",
        loggedById: "user1",
      };

      vi.mocked(prisma.gamePlay.findUnique).mockResolvedValue(existingPlay as any);

      await expect(deleteGamePlay("play1", "user2")).rejects.toThrow(
        "Unauthorized: You can only delete your own plays"
      );
    });
  });

  // ============================================================================
  // Play counts
  // ============================================================================

  describe("getPlayCountForGame", () => {
    it("should return play count for a game", async () => {
      vi.mocked(prisma.gamePlay.count).mockResolvedValue(5);

      const result = await getPlayCountForGame("game1");

      expect(result).toBe(5);
      expect(prisma.gamePlay.count).toHaveBeenCalledWith({
        where: { gameId: "game1" },
      });
    });
  });

  describe("getPlayCountForUser", () => {
    it("should return play count for a user", async () => {
      vi.mocked(prisma.gamePlay.count).mockResolvedValue(10);

      const result = await getPlayCountForUser("user1");

      expect(result).toBe(10);
      expect(prisma.gamePlay.count).toHaveBeenCalledWith({
        where: { loggedById: "user1" },
      });
    });
  });
});
