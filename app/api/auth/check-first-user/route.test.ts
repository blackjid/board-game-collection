import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

// Mock auth functions
vi.mock("@/lib/auth", () => ({
  isFirstUser: vi.fn(),
}));

import { isFirstUser } from "@/lib/auth";

describe("Check First User API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET /api/auth/check-first-user
  // ============================================================================

  describe("GET /api/auth/check-first-user", () => {
    it("should return isFirstUser: true when no users exist", async () => {
      vi.mocked(isFirstUser).mockResolvedValue(true);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isFirstUser).toBe(true);
    });

    it("should return isFirstUser: false when users exist", async () => {
      vi.mocked(isFirstUser).mockResolvedValue(false);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isFirstUser).toBe(false);
    });

    it("should return 500 on error", async () => {
      vi.mocked(isFirstUser).mockRejectedValue(new Error("Database error"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("An error occurred");
    });
  });
});

