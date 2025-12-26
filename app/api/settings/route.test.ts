import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "./route";
import prisma from "@/lib/prisma";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    settings: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    game: {
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

const mockAdminUser = {
  id: "admin-1",
  email: "admin@example.com",
  name: "Admin",
  role: "admin",
  passwordHash: "hashed",
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
    it("should return existing settings", async () => {
      const mockSettings = {
        id: "default",
        collectionName: "My Games",
        bggUsername: "testuser",
        syncSchedule: "daily",
        autoScrapeNewGames: true,
        lastScheduledSync: new Date("2024-01-01"),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.settings.findUnique).mockResolvedValue(mockSettings);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.collectionName).toBe("My Games");
      expect(data.bggUsername).toBe("testuser");
      expect(data.syncSchedule).toBe("daily");
      expect(data.autoScrapeNewGames).toBe(true);
    });

    it("should return default values when no settings exist", async () => {
      const defaultSettings = {
        id: "default",
        collectionName: null,
        bggUsername: null,
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        lastScheduledSync: null,
        updatedAt: new Date(),
      };

      vi.mocked(prisma.settings.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.settings.create).mockResolvedValue(defaultSettings);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.collectionName).toBeNull();
      expect(data.bggUsername).toBeNull();
      expect(prisma.settings.create).toHaveBeenCalledWith({
        data: { id: "default" },
      });
    });
  });

  // ============================================================================
  // PATCH /api/settings
  // ============================================================================

  describe("PATCH /api/settings", () => {
    it("should return 403 when not admin", async () => {
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Not authorized"));

      const request = new NextRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ bggUsername: "newuser" }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(403);
    });

    it("should update bggUsername", async () => {
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.settings.findUnique).mockResolvedValue(null);

      const updatedSettings = {
        id: "default",
        collectionName: null,
        bggUsername: "newuser",
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        lastScheduledSync: null,
        updatedAt: new Date(),
      };

      vi.mocked(prisma.settings.upsert).mockResolvedValue(updatedSettings);

      const request = new NextRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ bggUsername: "newuser" }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bggUsername).toBe("newuser");
      expect(prisma.settings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            bggUsername: "newuser",
          }),
        })
      );
    });

    it("should clear games when changing bggUsername to a different value", async () => {
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminUser);

      // Mock existing settings with a username
      vi.mocked(prisma.settings.findUnique).mockResolvedValue({
        id: "default",
        collectionName: null,
        bggUsername: "olduser",
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        lastScheduledSync: null,
        updatedAt: new Date(),
      });

      const updatedSettings = {
        id: "default",
        collectionName: null,
        bggUsername: "newuser",
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        lastScheduledSync: null,
        updatedAt: new Date(),
      };

      vi.mocked(prisma.settings.upsert).mockResolvedValue(updatedSettings);
      vi.mocked(prisma.game.deleteMany).mockResolvedValue({ count: 10 });
      vi.mocked(prisma.syncLog.deleteMany).mockResolvedValue({ count: 5 });

      const request = new NextRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ bggUsername: "newuser" }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bggUsername).toBe("newuser");
      expect(prisma.game.deleteMany).toHaveBeenCalledWith({});
      expect(prisma.syncLog.deleteMany).toHaveBeenCalledWith({});
    });

    it("should not clear games when setting same bggUsername", async () => {
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminUser);

      // Mock existing settings with the same username
      vi.mocked(prisma.settings.findUnique).mockResolvedValue({
        id: "default",
        collectionName: null,
        bggUsername: "sameuser",
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        lastScheduledSync: null,
        updatedAt: new Date(),
      });

      const updatedSettings = {
        id: "default",
        collectionName: null,
        bggUsername: "sameuser",
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        lastScheduledSync: null,
        updatedAt: new Date(),
      };

      vi.mocked(prisma.settings.upsert).mockResolvedValue(updatedSettings);

      const request = new NextRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ bggUsername: "sameuser" }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(prisma.game.deleteMany).not.toHaveBeenCalled();
      expect(prisma.syncLog.deleteMany).not.toHaveBeenCalled();
    });

    it("should update syncSchedule", async () => {
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminUser);

      const updatedSettings = {
        id: "default",
        collectionName: null,
        bggUsername: null,
        syncSchedule: "weekly",
        autoScrapeNewGames: false,
        lastScheduledSync: null,
        updatedAt: new Date(),
      };

      vi.mocked(prisma.settings.upsert).mockResolvedValue(updatedSettings);

      const request = new NextRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ syncSchedule: "weekly" }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.syncSchedule).toBe("weekly");
    });

    it("should update autoScrapeNewGames", async () => {
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminUser);

      const updatedSettings = {
        id: "default",
        collectionName: null,
        bggUsername: null,
        syncSchedule: "manual",
        autoScrapeNewGames: true,
        lastScheduledSync: null,
        updatedAt: new Date(),
      };

      vi.mocked(prisma.settings.upsert).mockResolvedValue(updatedSettings);

      const request = new NextRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ autoScrapeNewGames: true }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.autoScrapeNewGames).toBe(true);
    });

    it("should update multiple fields at once", async () => {
      vi.mocked(requireAdmin).mockResolvedValue(mockAdminUser);

      const updatedSettings = {
        id: "default",
        collectionName: "Board Games",
        bggUsername: "gamer123",
        syncSchedule: "daily",
        autoScrapeNewGames: true,
        lastScheduledSync: null,
        updatedAt: new Date(),
      };

      vi.mocked(prisma.settings.upsert).mockResolvedValue(updatedSettings);

      const request = new NextRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          collectionName: "Board Games",
          bggUsername: "gamer123",
          syncSchedule: "daily",
          autoScrapeNewGames: true,
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.collectionName).toBe("Board Games");
      expect(data.syncSchedule).toBe("daily");
      expect(prisma.settings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            collectionName: "Board Games",
            bggUsername: "gamer123",
            syncSchedule: "daily",
            autoScrapeNewGames: true,
          }),
        })
      );
    });
  });
});
