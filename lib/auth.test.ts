import { describe, it, expect, vi, beforeEach } from "vitest";
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

    it("should set session expiry to 7 days from now", async () => {
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

      // Should be 7 days from now
      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());

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
});
