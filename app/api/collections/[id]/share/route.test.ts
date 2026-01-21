import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    collection: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { POST, DELETE } from "./route";
import prisma from "@/lib/prisma";

describe("Share Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // POST /api/collections/[id]/share - Generate Share Token
  // ============================================================================

  describe("POST /api/collections/[id]/share", () => {
    it("should generate a share token for existing collection", async () => {
      const existingCollection = {
        id: "collection-1",
        name: "My Collection",
        slug: "my-collection",
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
      };

      vi.mocked(prisma.collection.findUnique).mockResolvedValue(existingCollection as any);
      vi.mocked(prisma.collection.update).mockImplementation(async ({ data }) => ({
        ...existingCollection,
        shareToken: data.shareToken as string,
      }) as any);

      const request = new NextRequest("http://localhost/api/collections/collection-1/share", {
        method: "POST",
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "collection-1" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      // Token should be a base64url string (16 chars from 12 random bytes)
      expect(data.shareToken).toBeDefined();
      expect(typeof data.shareToken).toBe("string");
      expect(data.shareToken.length).toBeGreaterThan(0);

      // Verify prisma was called correctly
      expect(prisma.collection.findUnique).toHaveBeenCalledWith({
        where: { id: "collection-1" },
      });
      expect(prisma.collection.update).toHaveBeenCalledWith({
        where: { id: "collection-1" },
        data: { shareToken: expect.any(String) },
      });
    });

    it("should regenerate share token for collection that already has one", async () => {
      const existingCollection = {
        id: "collection-1",
        name: "My Collection",
        slug: "my-collection",
        description: null,
        type: "manual",
        isPrimary: false,
        isPublic: false,
        shareToken: "old-token",
        bggUsername: null,
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        autoRuleType: null,
        autoRuleConfig: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.collection.findUnique).mockResolvedValue(existingCollection as any);
      vi.mocked(prisma.collection.update).mockImplementation(async ({ data }) => ({
        ...existingCollection,
        shareToken: data.shareToken as string,
      }) as any);

      const request = new NextRequest("http://localhost/api/collections/collection-1/share", {
        method: "POST",
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "collection-1" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      // Should have a new token (different from old-token)
      expect(data.shareToken).toBeDefined();
      expect(typeof data.shareToken).toBe("string");
      expect(data.shareToken).not.toBe("old-token");
    });

    it("should return 404 if collection not found", async () => {
      vi.mocked(prisma.collection.findUnique).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/collections/nonexistent/share", {
        method: "POST",
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Collection not found");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(prisma.collection.findUnique).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost/api/collections/collection-1/share", {
        method: "POST",
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "collection-1" }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Failed to generate share token");
    });
  });

  // ============================================================================
  // DELETE /api/collections/[id]/share - Remove Share Token
  // ============================================================================

  describe("DELETE /api/collections/[id]/share", () => {
    it("should remove share token from collection", async () => {
      const existingCollection = {
        id: "collection-1",
        name: "My Collection",
        slug: "my-collection",
        description: null,
        type: "manual",
        isPrimary: false,
        isPublic: false,
        shareToken: "existing-token",
        bggUsername: null,
        syncSchedule: "manual",
        autoScrapeNewGames: false,
        autoRuleType: null,
        autoRuleConfig: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.collection.findUnique).mockResolvedValue(existingCollection);
      vi.mocked(prisma.collection.update).mockResolvedValue({
        ...existingCollection,
        shareToken: null,
      });

      const request = new NextRequest("http://localhost/api/collections/collection-1/share", {
        method: "DELETE",
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "collection-1" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify prisma was called correctly
      expect(prisma.collection.update).toHaveBeenCalledWith({
        where: { id: "collection-1" },
        data: { shareToken: null },
      });
    });

    it("should succeed even if collection has no share token", async () => {
      const existingCollection = {
        id: "collection-1",
        name: "My Collection",
        slug: "my-collection",
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
      };

      vi.mocked(prisma.collection.findUnique).mockResolvedValue(existingCollection);
      vi.mocked(prisma.collection.update).mockResolvedValue(existingCollection);

      const request = new NextRequest("http://localhost/api/collections/collection-1/share", {
        method: "DELETE",
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "collection-1" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should return 404 if collection not found", async () => {
      vi.mocked(prisma.collection.findUnique).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/collections/nonexistent/share", {
        method: "DELETE",
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Collection not found");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(prisma.collection.findUnique).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost/api/collections/collection-1/share", {
        method: "DELETE",
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "collection-1" }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Failed to remove share token");
    });
  });
});
