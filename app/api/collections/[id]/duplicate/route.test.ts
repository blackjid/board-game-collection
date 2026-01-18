import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    collection: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    collectionGame: {
      createMany: vi.fn(),
    },
  },
}));

import prisma from "@/lib/prisma";

describe("POST /api/collections/[id]/duplicate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Validation
  // ============================================================================

  it("should return 400 if name is missing", async () => {
    const request = new NextRequest("http://localhost/api/collections/123/duplicate", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "source-id" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Collection name is required");
  });

  it("should return 404 if source collection not found", async () => {
    vi.mocked(prisma.collection.findUnique).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/collections/123/duplicate", {
      method: "POST",
      body: JSON.stringify({ name: "New List" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "source-id" }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Source collection not found");
  });

  it("should return 404 if primary collection not found", async () => {
    vi.mocked(prisma.collection.findUnique).mockResolvedValue({
      id: "source-id",
      name: "Source List",
      description: "Description",
      type: "manual",
      isPrimary: false,
      bggUsername: null,
      syncSchedule: "manual",
      autoScrapeNewGames: false,
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      games: [],
    });

    vi.mocked(prisma.collection.findFirst).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/collections/123/duplicate", {
      method: "POST",
      body: JSON.stringify({ name: "New List" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "source-id" }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Primary collection not found");
  });

  // ============================================================================
  // Success Cases
  // ============================================================================

  it("should duplicate collection with games from primary collection", async () => {
    const sourceCollection = {
      id: "source-id",
      name: "Vacation Games",
      description: "Games for vacation",
      type: "manual",
      isPrimary: false,
      bggUsername: null,
      syncSchedule: "manual",
      autoScrapeNewGames: false,
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      games: [
        { gameId: "game-1", game: { id: "game-1", name: "Game 1" } },
        { gameId: "game-2", game: { id: "game-2", name: "Game 2" } },
        { gameId: "game-3", game: { id: "game-3", name: "Game 3" } },
      ],
    };

    const primaryCollection = {
      id: "primary-id",
      name: "Primary",
      description: null,
      type: "bgg_sync",
      isPrimary: true,
      bggUsername: "testuser",
      syncSchedule: "manual",
      autoScrapeNewGames: false,
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      games: [
        { gameId: "game-1" },
        { gameId: "game-2" },
        // game-3 is NOT in primary collection
      ],
    };

    const newCollection = {
      id: "new-id",
      name: "Vacation Games (Copy)",
      description: "Games for vacation",
      type: "manual",
      isPrimary: false,
      bggUsername: null,
      syncSchedule: "manual",
      autoScrapeNewGames: false,
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.collection.findUnique).mockResolvedValue(sourceCollection as any);
    vi.mocked(prisma.collection.findFirst).mockResolvedValue(primaryCollection as any);
    vi.mocked(prisma.collection.create).mockResolvedValue(newCollection);
    vi.mocked(prisma.collectionGame.createMany).mockResolvedValue({ count: 2 });

    const request = new NextRequest("http://localhost/api/collections/123/duplicate", {
      method: "POST",
      body: JSON.stringify({ name: "Vacation Games (Copy)" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "source-id" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    // Verify new collection was created
    expect(prisma.collection.create).toHaveBeenCalledWith({
      data: {
        name: "Vacation Games (Copy)",
        description: "Games for vacation",
        type: "manual",
        isPrimary: false,
      },
    });

    // Verify only games from primary collection were added
    expect(prisma.collectionGame.createMany).toHaveBeenCalledWith({
      data: [
        { collectionId: "new-id", gameId: "game-1", addedBy: "manual" },
        { collectionId: "new-id", gameId: "game-2", addedBy: "manual" },
      ],
    });

    // Verify response
    expect(data.collection.id).toBe("new-id");
    expect(data.collection.name).toBe("Vacation Games (Copy)");
    expect(data.gamesAdded).toBe(2);
    expect(data.gamesSkipped).toBe(1); // game-3 was skipped
  });

  it("should handle empty source collection", async () => {
    const sourceCollection = {
      id: "source-id",
      name: "Empty List",
      description: null,
      type: "manual",
      isPrimary: false,
      bggUsername: null,
      syncSchedule: "manual",
      autoScrapeNewGames: false,
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      games: [],
    };

    const primaryCollection = {
      id: "primary-id",
      name: "Primary",
      description: null,
      type: "bgg_sync",
      isPrimary: true,
      bggUsername: "testuser",
      syncSchedule: "manual",
      autoScrapeNewGames: false,
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      games: [{ gameId: "game-1" }],
    };

    const newCollection = {
      id: "new-id",
      name: "Empty List (Copy)",
      description: null,
      type: "manual",
      isPrimary: false,
      bggUsername: null,
      syncSchedule: "manual",
      autoScrapeNewGames: false,
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.collection.findUnique).mockResolvedValue(sourceCollection as any);
    vi.mocked(prisma.collection.findFirst).mockResolvedValue(primaryCollection as any);
    vi.mocked(prisma.collection.create).mockResolvedValue(newCollection);

    const request = new NextRequest("http://localhost/api/collections/123/duplicate", {
      method: "POST",
      body: JSON.stringify({ name: "Empty List (Copy)" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "source-id" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    // Should not call createMany when there are no games
    expect(prisma.collectionGame.createMany).not.toHaveBeenCalled();

    expect(data.gamesAdded).toBe(0);
    expect(data.gamesSkipped).toBe(0);
  });

  it("should copy description from source collection", async () => {
    const sourceCollection = {
      id: "source-id",
      name: "Source",
      description: "Original description",
      type: "manual",
      isPrimary: false,
      bggUsername: null,
      syncSchedule: "manual",
      autoScrapeNewGames: false,
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      games: [],
    };

    const primaryCollection = {
      id: "primary-id",
      name: "Primary",
      description: null,
      type: "bgg_sync",
      isPrimary: true,
      bggUsername: "testuser",
      syncSchedule: "manual",
      autoScrapeNewGames: false,
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      games: [],
    };

    const newCollection = {
      id: "new-id",
      name: "Copy",
      description: "Original description",
      type: "manual",
      isPrimary: false,
      bggUsername: null,
      syncSchedule: "manual",
      autoScrapeNewGames: false,
      lastSyncedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.collection.findUnique).mockResolvedValue(sourceCollection as any);
    vi.mocked(prisma.collection.findFirst).mockResolvedValue(primaryCollection as any);
    vi.mocked(prisma.collection.create).mockResolvedValue(newCollection);

    const request = new NextRequest("http://localhost/api/collections/123/duplicate", {
      method: "POST",
      body: JSON.stringify({ name: "Copy" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ id: "source-id" }),
    });

    expect(response.status).toBe(200);

    // Verify description was copied
    expect(prisma.collection.create).toHaveBeenCalledWith({
      data: {
        name: "Copy",
        description: "Original description",
        type: "manual",
        isPrimary: false,
      },
    });
  });
});
