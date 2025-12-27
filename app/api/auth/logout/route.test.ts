import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

// Mock auth functions
vi.mock("@/lib/auth", () => ({
  deleteSession: vi.fn(),
}));

import { deleteSession } from "@/lib/auth";

describe("Logout API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // POST /api/auth/logout
  // ============================================================================

  describe("POST /api/auth/logout", () => {
    it("should logout successfully when session exists", async () => {
      vi.mocked(deleteSession).mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          Cookie: "session_id=session-id-123",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(deleteSession).toHaveBeenCalledWith("session-id-123");
    });

    it("should handle logout when no session exists", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/logout", {
        method: "POST",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(deleteSession).not.toHaveBeenCalled();
    });

    it("should return 500 when logout throws error", async () => {
      vi.mocked(deleteSession).mockRejectedValue(new Error("Session not found"));

      const request = new NextRequest("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          Cookie: "session_id=session-id-123",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("An error occurred during logout");
    });
  });
});
