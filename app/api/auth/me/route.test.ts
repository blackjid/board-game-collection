import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

// Mock auth functions
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
  isFirstUser: vi.fn(),
}));

import { getCurrentUser, isFirstUser } from "@/lib/auth";

describe("Me API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET /api/auth/me
  // ============================================================================

  describe("GET /api/auth/me", () => {
    it("should return null user and isFirstUser when not authenticated", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);
      vi.mocked(isFirstUser).mockResolvedValue(true);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeNull();
      expect(data.isFirstUser).toBe(true);
    });

    it("should return null user and isFirstUser false when users exist", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);
      vi.mocked(isFirstUser).mockResolvedValue(false);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeNull();
      expect(data.isFirstUser).toBe(false);
    });

    it("should return user data and isFirstUser when authenticated", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(isFirstUser).mockResolvedValue(false);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toEqual({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        role: "admin",
      });
      expect(data.isFirstUser).toBe(false);
    });

    it("should not expose passwordHash in response", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        role: "user",
        passwordHash: "secret-hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(isFirstUser).mockResolvedValue(false);

      const response = await GET();
      const data = await response.json();

      expect(data.user).not.toHaveProperty("passwordHash");
    });

    it("should return 500 on error", async () => {
      vi.mocked(getCurrentUser).mockRejectedValue(new Error("Database error"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("An error occurred");
    });
  });
});
