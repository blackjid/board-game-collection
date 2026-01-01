import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "./route";
import prisma from "@/lib/prisma";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    collection: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    collectionGame: {
      deleteMany: vi.fn(),
    },
    syncLog: {
      deleteMany: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";

const mockPrimaryCollection = {
  id: "col-1",
  name: "My Games",
  description: null,
  type: "bgg_sync",
  isPrimary: true,
  bggUsername: "testuser",
  syncSchedule: "daily",
  autoScrapeNewGames: true,
  lastSyncedAt: new Date("2024-01-01"),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Settings API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET /api/settings
  // ============================================================================

  describe("GET /api/settings", () => {
    it("should return settings from primary collection", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(mockPrimaryCollection);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.collectionName).toBe("My Games");
      expect(data.bggUsername).toBe("testuser");
      expect(data.syncSchedule).toBe("daily");
      expect(data.autoScrapeNewGames).toBe(true);
    });

    it("should return null values when no primary collection exists", async () => {
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.collectionName).toBeNull();
      expect(data.bggUsername).toBeNull();
      expect(data.syncSchedule).toBe("manual");
      expect(data.autoScrapeNewGames).toBe(false);
    });
  });

  // ============================================================================
  // PATCH /api/settings
  // ============================================================================

  describe("PATCH /api/settings", () => {
    it("should require admin authentication", async () => {
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"));

      const request = new NextRequest("http://localhost/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ collectionName: "Test" }),
      });

      const response = await PATCH(request);
      expect(response.status).toBe(403);
    });

    it("should update collection name", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(mockPrimaryCollection);
      vi.mocked(prisma.collection.update).mockResolvedValue({
        ...mockPrimaryCollection,
        name: "Updated Name",
      });

      const request = new NextRequest("http://localhost/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ collectionName: "Updated Name" }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.collectionName).toBe("Updated Name");
    });

    it("should update bggUsername and set type to bgg_sync", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.collection.findFirst).mockResolvedValue({
        ...mockPrimaryCollection,
        bggUsername: null,
        type: "manual",
      });
      vi.mocked(prisma.collection.update).mockResolvedValue({
        ...mockPrimaryCollection,
        bggUsername: "newuser",
        type: "bgg_sync",
      });

      const request = new NextRequest("http://localhost/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ bggUsername: "newuser" }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bggUsername).toBe("newuser");
    });

    it("should clear collection games when changing bggUsername", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(mockPrimaryCollection);
      vi.mocked(prisma.collection.update).mockResolvedValue({
        ...mockPrimaryCollection,
        bggUsername: "differentuser",
      });

      const request = new NextRequest("http://localhost/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ bggUsername: "differentuser" }),
      });

      await PATCH(request);

      expect(prisma.collectionGame.deleteMany).toHaveBeenCalledWith({
        where: { collectionId: "col-1" },
      });
      expect(prisma.syncLog.deleteMany).toHaveBeenCalled();
    });

    it("should create primary collection if none exists", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.collection.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.collection.create).mockResolvedValue({
        ...mockPrimaryCollection,
        id: "new-col",
        name: "New Collection",
      });

      const request = new NextRequest("http://localhost/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ collectionName: "New Collection" }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(prisma.collection.create).toHaveBeenCalled();
      expect(data.collectionName).toBe("New Collection");
    });
  });
});
