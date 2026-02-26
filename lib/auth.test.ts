import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import bcrypt from "bcryptjs";

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      count: vi.fn(),
    },
    session: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock next/headers cookies
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import prisma from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  createSession,
  deleteSession,
  isFirstUser,
  getSessionFromCookie,
  getCurrentUser,
  requireAuth,
  requireAdmin,
  setSessionCookie,
  clearSessionCookie,
  getSessionCookieOptions,
} from "./auth";

describe("lib/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Password Utilities
  // ============================================================================

  describe("hashPassword", () => {
    it("should hash password with bcrypt", async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed-password-123" as never);

      const result = await hashPassword("mypassword");

      expect(bcrypt.hash).toHaveBeenCalledWith("mypassword", 12);
      expect(result).toBe("hashed-password-123");
    });

    it("should use 12 rounds for bcrypt", async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue("hash" as never);

      await hashPassword("password");

      expect(bcrypt.hash).toHaveBeenCalledWith(expect.any(String), 12);
    });
  });

  describe("verifyPassword", () => {
    it("should return true for valid password", async () => {
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await verifyPassword("password", "hashedPassword");

      expect(bcrypt.compare).toHaveBeenCalledWith("password", "hashedPassword");
      expect(result).toBe(true);
    });

    it("should return false for invalid password", async () => {
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const result = await verifyPassword("wrongpassword", "hashedPassword");

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // Session Utilities
  // ============================================================================

  describe("createSession", () => {
    it("should create a session and return session id", async () => {
      vi.mocked(prisma.session.create).mockResolvedValue({
        id: "session-123",
        userId: "user-1",
        expiresAt: new Date(),
      });

      const result = await createSession("user-1");

      expect(prisma.session.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          expiresAt: expect.any(Date),
        },
      });
      expect(result).toBe("session-123");
    });

    it("should set session expiry to SESSION_EXPIRY_DAYS from now", async () => {
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);

      vi.mocked(prisma.session.create).mockResolvedValue({
        id: "session-123",
        userId: "user-1",
        expiresAt: new Date(),
      });

      await createSession("user-1");

      const createCall = vi.mocked(prisma.session.create).mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      const days = parseInt(process.env.SESSION_EXPIRY_DAYS || "30", 10);
      const expectedExpiry = new Date(now);
      expectedExpiry.setDate(expectedExpiry.getDate() + days);

      expect(expiresAt.getTime()).toBe(expectedExpiry.getTime());

      vi.useRealTimers();
    });
  });

  describe("deleteSession", () => {
    it("should delete session by id", async () => {
      vi.mocked(prisma.session.delete).mockResolvedValue({
        id: "session-123",
        userId: "user-1",
        expiresAt: new Date(),
      });

      await deleteSession("session-123");

      expect(prisma.session.delete).toHaveBeenCalledWith({
        where: { id: "session-123" },
      });
    });

    it("should not throw when session not found", async () => {
      vi.mocked(prisma.session.delete).mockRejectedValue(new Error("Not found"));

      // Should not throw
      await expect(deleteSession("nonexistent")).resolves.toBeUndefined();
    });
  });

  // ============================================================================
  // First User Check
  // ============================================================================

  describe("isFirstUser", () => {
    it("should return true when no users exist", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      const result = await isFirstUser();

      expect(result).toBe(true);
    });

    it("should return false when users exist", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const result = await isFirstUser();

      expect(result).toBe(false);
    });

    it("should return false when multiple users exist", async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(5);

      const result = await isFirstUser();

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // Session Cookie Functions
  // ============================================================================

  describe("getSessionFromCookie", () => {
    it("should return null when no session cookie exists", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await getSessionFromCookie();

      expect(result).toBeNull();
    });

    it("should return null when session not found in database", async () => {
      mockCookieStore.get.mockReturnValue({ value: "session-123" });
      vi.mocked(prisma.session.findUnique).mockResolvedValue(null);

      const result = await getSessionFromCookie();

      expect(result).toBeNull();
    });

    it("should return null and delete expired session", async () => {
      mockCookieStore.get.mockReturnValue({ value: "session-123" });

      const expiredSession = {
        id: "session-123",
        userId: "user-1",
        expiresAt: new Date("2020-01-01"), // Past date
        user: { id: "user-1", name: "Test User", email: "test@test.com", role: "admin" },
      };

      vi.mocked(prisma.session.findUnique).mockResolvedValue(expiredSession as never);
      vi.mocked(prisma.session.delete).mockResolvedValue(expiredSession as never);

      const result = await getSessionFromCookie();

      expect(result).toBeNull();
      expect(prisma.session.delete).toHaveBeenCalledWith({
        where: { id: "session-123" },
      });
    });

    it("should return session when valid", async () => {
      mockCookieStore.get.mockReturnValue({ value: "session-123" });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // Tomorrow

      const validSession = {
        id: "session-123",
        userId: "user-1",
        expiresAt: futureDate,
        user: { id: "user-1", name: "Test User", email: "test@test.com", role: "admin" },
      };

      vi.mocked(prisma.session.findUnique).mockResolvedValue(validSession as never);

      const result = await getSessionFromCookie();

      expect(result).toEqual(validSession);
    });
  });

  describe("getCurrentUser", () => {
    it("should return null when no session", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it("should return user when session exists", async () => {
      mockCookieStore.get.mockReturnValue({ value: "session-123" });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const user = { id: "user-1", name: "Test User", email: "test@test.com", role: "admin" };
      const validSession = {
        id: "session-123",
        userId: "user-1",
        expiresAt: futureDate,
        user,
      };

      vi.mocked(prisma.session.findUnique).mockResolvedValue(validSession as never);

      const result = await getCurrentUser();

      expect(result).toEqual(user);
    });
  });

  describe("requireAuth", () => {
    it("should throw when no user is logged in", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      await expect(requireAuth()).rejects.toThrow("Unauthorized");
    });

    it("should return user when authenticated", async () => {
      mockCookieStore.get.mockReturnValue({ value: "session-123" });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const user = { id: "user-1", name: "Test User", email: "test@test.com", role: "user" };
      const validSession = {
        id: "session-123",
        userId: "user-1",
        expiresAt: futureDate,
        user,
      };

      vi.mocked(prisma.session.findUnique).mockResolvedValue(validSession as never);

      const result = await requireAuth();

      expect(result).toEqual(user);
    });
  });

  describe("requireAdmin", () => {
    it("should throw when no user is logged in", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      await expect(requireAdmin()).rejects.toThrow("Forbidden");
    });

    it("should throw when user is not admin", async () => {
      mockCookieStore.get.mockReturnValue({ value: "session-123" });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const user = { id: "user-1", name: "Test User", email: "test@test.com", role: "user" };
      const validSession = {
        id: "session-123",
        userId: "user-1",
        expiresAt: futureDate,
        user,
      };

      vi.mocked(prisma.session.findUnique).mockResolvedValue(validSession as never);

      await expect(requireAdmin()).rejects.toThrow("Forbidden");
    });

    it("should return user when admin", async () => {
      mockCookieStore.get.mockReturnValue({ value: "session-123" });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const user = { id: "user-1", name: "Admin User", email: "admin@test.com", role: "admin" };
      const validSession = {
        id: "session-123",
        userId: "user-1",
        expiresAt: futureDate,
        user,
      };

      vi.mocked(prisma.session.findUnique).mockResolvedValue(validSession as never);

      const result = await requireAdmin();

      expect(result).toEqual(user);
    });
  });

  describe("setSessionCookie", () => {
    it("should set session cookie with correct options", async () => {
      await setSessionCookie("session-123");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "session_id",
        "session-123",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        })
      );
    });
  });

  describe("clearSessionCookie", () => {
    it("should delete session cookie", async () => {
      await clearSessionCookie();

      expect(mockCookieStore.delete).toHaveBeenCalledWith("session_id");
    });
  });

  describe("getSessionCookieOptions", () => {
    it("should return correct default options with 30-day maxAge", async () => {
      const days = parseInt(process.env.SESSION_EXPIRY_DAYS || "30", 10);
      const options = await getSessionCookieOptions();
      expect(options).toEqual({
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: days * 24 * 60 * 60,
      });
    });
  });

  // ============================================================================
  // Sliding Expiration
  // ============================================================================

  describe("getSessionFromCookie - sliding expiration", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("extends session and refreshes cookie when time remaining < half window", async () => {
      const days = parseInt(process.env.SESSION_EXPIRY_DAYS || "30", 10);
      const now = new Date("2026-01-15T12:00:00Z");
      vi.setSystemTime(now);

      // 5 days remaining — less than half of 30 days (15 days)
      const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      mockCookieStore.get.mockReturnValue({ value: "session-slide" });
      vi.mocked(prisma.session.findUnique).mockResolvedValue({
        id: "session-slide",
        userId: "user-1",
        expiresAt: fiveDaysFromNow,
        createdAt: now,
        user: { id: "user-1", email: "test@example.com", name: "Test", role: "user" },
      } as never);
      vi.mocked(prisma.session.update).mockResolvedValue({} as never);

      await getSessionFromCookie();

      const expectedExpiry = new Date(now);
      expectedExpiry.setDate(expectedExpiry.getDate() + days);
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: "session-slide" },
        data: { expiresAt: expectedExpiry },
      });
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "session_id",
        "session-slide",
        expect.objectContaining({ maxAge: days * 24 * 60 * 60 })
      );
    });

    it("does NOT extend session when time remaining >= half window", async () => {
      const now = new Date("2026-01-15T12:00:00Z");
      vi.setSystemTime(now);

      // 25 days remaining — more than half of 30 days (15 days)
      const twentyFiveDaysFromNow = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000);
      mockCookieStore.get.mockReturnValue({ value: "session-fresh" });
      vi.mocked(prisma.session.findUnique).mockResolvedValue({
        id: "session-fresh",
        userId: "user-1",
        expiresAt: twentyFiveDaysFromNow,
        createdAt: now,
        user: { id: "user-1", email: "test@example.com", name: "Test", role: "user" },
      } as never);

      await getSessionFromCookie();

      expect(prisma.session.update).not.toHaveBeenCalled();
      expect(mockCookieStore.set).not.toHaveBeenCalled();
    });
  });
});
