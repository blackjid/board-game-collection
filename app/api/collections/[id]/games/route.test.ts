import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  default: {
    collection: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    collectionGame: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    game: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/scrape-queue", () => ({
  enqueueScrape: vi.fn(),
}));

import { POST, DELETE } from "./route";

describe("/api/collections/[id]/games", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // POST - Add game to collection
  // ============================================================================

  describe("POST", () => {
    it("should add an existing game to a list without adding to primary collection", async () => {
      const listId = "list-1";
      const gameId = "999";
      const gameName = "New BGG Game";

      // Setup: Game already exists (created by POST /api/games)
      vi.mocked(prisma.game.findUnique).mockResolvedValue({
        id: gameId,
        name: gameName,
        yearPublished: 2023,
        isExpansion: false,
        baseGameId: null,
        rating: null,
        description: null,
        image: null,
        thumbnail: null,
        selectedThumbnail: null,
        minPlayers: null,
        maxPlayers: null,
        minPlaytime: null,
        maxPlaytime: null,
        minAge: null,
        categories: null,
        mechanics: null,
        availableImages: null,
        componentImages: null,
        lastScraped: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Setup: List (non-primary collection) exists
      vi.mocked(prisma.collection.findUnique).mockResolvedValue({
        id: listId,
        name: "Trip to Mountains",
        slug: "trip-to-mountains",
        description: null,
        type: "manual",
        isPrimary: false, // This is a list, NOT the primary collection
        isPublic: false,
        shareToken: null,
        bggUsername: null,
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        autoRuleType: null,
        autoRuleConfig: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Setup: Game is not yet in the list
      vi.mocked(prisma.collectionGame.findUnique).mockResolvedValue(null);

      // Setup: CollectionGame.create returns the link
      vi.mocked(prisma.collectionGame.create).mockResolvedValue({
        id: "cg-1",
        collectionId: listId,
        gameId: gameId,
        addedBy: "manual",
        addedAt: new Date(),
        game: {
          id: gameId,
          name: gameName,
          yearPublished: 2023,
          isExpansion: false,
        baseGameId: null,
          rating: null,
          description: null,
          image: null,
          thumbnail: null,
          selectedThumbnail: null,
          minPlayers: null,
          maxPlayers: null,
          minPlaytime: null,
          maxPlaytime: null,
          minAge: null,
          categories: null,
          mechanics: null,
          availableImages: null,
          componentImages: null,
          lastScraped: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any);

      vi.mocked(prisma.collection.update).mockResolvedValue({
        id: listId,
        name: "Trip to Mountains",
        slug: "trip-to-mountains",
        description: null,
        type: "manual",
        isPrimary: false,
        isPublic: false,
        shareToken: null,
        bggUsername: null,
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        autoRuleType: null,
        autoRuleConfig: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/collections/list-1/games", {
        method: "POST",
        body: JSON.stringify({
          gameId,
          name: gameName,
          yearPublished: 2023,
          isExpansion: false,
        baseGameId: null,
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: listId }) });
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify the game was added to the LIST
      expect(prisma.collectionGame.create).toHaveBeenCalledWith({
        data: {
          collectionId: listId,
          gameId: gameId,
          contributorId: null,
        },
        include: {
          game: true,
          contributor: true,
        },
      });

      // CRITICAL: Verify the game was NOT created in Game table (already existed)
      expect(prisma.game.create).not.toHaveBeenCalled();

      // CRITICAL: Verify the game was only added to THIS collection, not queried for primary
      // We check that findFirst (used to find primary collection) was NOT called
      expect(prisma.collection.findFirst).not.toHaveBeenCalled();

      // Verify only ONE collectionGame.create call (to the list, not to primary)
      expect(prisma.collectionGame.create).toHaveBeenCalledTimes(1);
    });

    it("should create a new game and add it ONLY to the specified list", async () => {
      const listId = "list-1";
      const gameId = "888";
      const gameName = "Brand New Game";

      // Setup: Game doesn't exist yet
      vi.mocked(prisma.game.findUnique).mockResolvedValue(null);

      // Setup: List exists
      vi.mocked(prisma.collection.findUnique).mockResolvedValue({
        id: listId,
        name: "Trip to Mountains",
        slug: "trip-to-mountains",
        description: null,
        type: "manual",
        isPrimary: false,
        isPublic: false,
        shareToken: null,
        bggUsername: null,
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        autoRuleType: null,
        autoRuleConfig: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Setup: Game not in list yet
      vi.mocked(prisma.collectionGame.findUnique).mockResolvedValue(null);

      // Setup: Game.create creates the game
      vi.mocked(prisma.game.create).mockResolvedValue({
        id: gameId,
        name: gameName,
        yearPublished: 2024,
        isExpansion: false,
        baseGameId: null,
        rating: null,
        description: null,
        image: null,
        thumbnail: null,
        selectedThumbnail: null,
        minPlayers: null,
        maxPlayers: null,
        minPlaytime: null,
        maxPlaytime: null,
        minAge: null,
        categories: null,
        mechanics: null,
        availableImages: null,
        componentImages: null,
        lastScraped: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Setup: CollectionGame.create adds to list
      vi.mocked(prisma.collectionGame.create).mockResolvedValue({
        id: "cg-1",
        collectionId: listId,
        gameId: gameId,
        addedBy: "manual",
        addedAt: new Date(),
        game: {
          id: gameId,
          name: gameName,
          yearPublished: 2024,
          isExpansion: false,
        baseGameId: null,
          rating: null,
          description: null,
          image: null,
          thumbnail: null,
          selectedThumbnail: null,
          minPlayers: null,
          maxPlayers: null,
          minPlaytime: null,
          maxPlaytime: null,
          minAge: null,
          categories: null,
          mechanics: null,
          availableImages: null,
          componentImages: null,
          lastScraped: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any);

      vi.mocked(prisma.collection.update).mockResolvedValue({
        id: listId,
        name: "Trip to Mountains",
        slug: "trip-to-mountains",
        description: null,
        type: "manual",
        isPrimary: false,
        isPublic: false,
        shareToken: null,
        bggUsername: null,
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        autoRuleType: null,
        autoRuleConfig: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/collections/list-1/games", {
        method: "POST",
        body: JSON.stringify({
          gameId,
          name: gameName,
          yearPublished: 2024,
          isExpansion: false,
        baseGameId: null,
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: listId }) });
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.wasCreated).toBe(true);

      // Verify game was created
      expect(prisma.game.create).toHaveBeenCalledWith({
        data: {
          id: gameId,
          name: gameName,
          yearPublished: 2024,
          isExpansion: false,
        },
      });

      // CRITICAL: Verify only added to the specified list, not to primary collection
      expect(prisma.collection.findFirst).not.toHaveBeenCalled();
      expect(prisma.collectionGame.create).toHaveBeenCalledTimes(1);
      expect(prisma.collectionGame.create).toHaveBeenCalledWith({
        data: {
          collectionId: listId,
          gameId: gameId,
          contributorId: null,
        },
        include: {
          game: true,
          contributor: true,
        },
      });
    });

    it("should return error if game already in collection", async () => {
      const listId = "list-1";
      const gameId = "123";

      vi.mocked(prisma.collection.findUnique).mockResolvedValue({
        id: listId,
        name: "Trip to Mountains",
        slug: "trip-to-mountains",
        description: null,
        type: "manual",
        isPrimary: false,
        isPublic: false,
        shareToken: null,
        bggUsername: null,
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        autoRuleType: null,
        autoRuleConfig: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Game already in collection
      vi.mocked(prisma.collectionGame.findUnique).mockResolvedValue({
        id: "cg-existing",
        collectionId: listId,
        gameId: gameId,
        addedBy: "manual",
        addedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/collections/list-1/games", {
        method: "POST",
        body: JSON.stringify({ gameId }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: listId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Game is already in this collection");
    });
  });

  // ============================================================================
  // DELETE - Remove game from collection
  // ============================================================================

  describe("DELETE", () => {
    it("should remove a game from a list without affecting other collections", async () => {
      const listId = "list-1";
      const gameId = "123";

      vi.mocked(prisma.collection.findUnique).mockResolvedValue({
        id: listId,
        name: "Trip to Mountains",
        slug: "trip-to-mountains",
        description: null,
        type: "manual",
        isPrimary: false,
        isPublic: false,
        shareToken: null,
        bggUsername: null,
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        autoRuleType: null,
        autoRuleConfig: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.collectionGame.findUnique).mockResolvedValue({
        id: "cg-1",
        collectionId: listId,
        gameId: gameId,
        addedBy: "manual",
        addedAt: new Date(),
      });

      vi.mocked(prisma.collectionGame.delete).mockResolvedValue({
        id: "cg-1",
        collectionId: listId,
        gameId: gameId,
        addedBy: "manual",
        addedAt: new Date(),
      });
      vi.mocked(prisma.collection.update).mockResolvedValue({
        id: listId,
        name: "Trip to Mountains",
        slug: "trip-to-mountains",
        description: null,
        type: "manual",
        isPrimary: false,
        isPublic: false,
        shareToken: null,
        bggUsername: null,
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        autoRuleType: null,
        autoRuleConfig: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/collections/list-1/games", {
        method: "DELETE",
        body: JSON.stringify({ gameId }),
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: listId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify delete was called with correct params (only for this collection)
      expect(prisma.collectionGame.delete).toHaveBeenCalledWith({
        where: {
          collectionId_gameId: { collectionId: listId, gameId },
        },
      });
    });
  });
});
