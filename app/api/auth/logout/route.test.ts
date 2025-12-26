import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// Mock cookies
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Mock auth functions
vi.mock("@/lib/auth", () => ({
  deleteSession: vi.fn(),
  clearSessionCookie: vi.fn(),
}));

import { deleteSession, clearSessionCookie } from "@/lib/auth";

describe("Logout API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // POST /api/auth/logout
  // ============================================================================

  describe("POST /api/auth/logout", () => {
    it("should logout successfully when session exists", async () => {
      mockCookieStore.get.mockReturnValue({ value: "session-id-123" });
      vi.mocked(deleteSession).mockResolvedValue(undefined);
      vi.mocked(clearSessionCookie).mockResolvedValue(undefined);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(deleteSession).toHaveBeenCalledWith("session-id-123");
      expect(clearSessionCookie).toHaveBeenCalled();
    });

    it("should handle logout when no session exists", async () => {
      mockCookieStore.get.mockReturnValue(undefined);
      vi.mocked(clearSessionCookie).mockResolvedValue(undefined);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(deleteSession).not.toHaveBeenCalled();
      expect(clearSessionCookie).toHaveBeenCalled();
    });

    it("should return 500 when logout throws error", async () => {
      mockCookieStore.get.mockReturnValue({ value: "session-id-123" });
      vi.mocked(deleteSession).mockRejectedValue(new Error("Session not found"));
      vi.mocked(clearSessionCookie).mockRejectedValue(new Error("Cookie error"));

      // The route catches errors and returns 500
      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("An error occurred during logout");
    });
  });
});
