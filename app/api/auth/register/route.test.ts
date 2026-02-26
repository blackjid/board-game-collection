import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import prisma from "@/lib/prisma";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    session: {
      create: vi.fn(),
    },
  },
}));

// Mock auth functions
vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn(),
  createSession: vi.fn(),
  isFirstUser: vi.fn(),
  getSessionCookieOptions: vi.fn().mockResolvedValue({
    httpOnly: true,
    secure: false,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  }),
}));

import { hashPassword, createSession, isFirstUser, getSessionCookieOptions } from "@/lib/auth";

describe("Register API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // POST /api/auth/register
  // ============================================================================

  describe("POST /api/auth/register", () => {
    it("should return 400 when email is missing", async () => {
      vi.mocked(isFirstUser).mockResolvedValue(true);

      const request = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ password: "password123" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email and password are required");
    });

    it("should return 400 when password is missing", async () => {
      vi.mocked(isFirstUser).mockResolvedValue(true);

      const request = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email and password are required");
    });

    it("should return 400 when password is too short", async () => {
      vi.mocked(isFirstUser).mockResolvedValue(true);

      const request = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", password: "12345" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Password must be at least 6 characters");
    });

    it("should return 403 when not first user (registration disabled)", async () => {
      vi.mocked(isFirstUser).mockResolvedValue(false);

      const request = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", password: "password123" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Registration is disabled. Please contact an administrator.");
    });

    it("should return 400 when email already exists", async () => {
      vi.mocked(isFirstUser).mockResolvedValue(true);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "existing-user",
        email: "test@example.com",
        passwordHash: "hash",
        name: null,
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", password: "password123" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email already in use");
    });

    it("should create first user as admin", async () => {
      vi.mocked(isFirstUser).mockResolvedValue(true);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(hashPassword).mockResolvedValue("hashed-password");
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: "new-user-1",
        email: "admin@example.com",
        passwordHash: "hashed-password",
        name: "Admin User",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(createSession).mockResolvedValue("session-id-123");

      const request = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "admin@example.com",
          password: "password123",
          name: "Admin User",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.role).toBe("admin");
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: "admin@example.com",
          passwordHash: "hashed-password",
          name: "Admin User",
          role: "admin",
        },
      });
      expect(getSessionCookieOptions).toHaveBeenCalled();
      // Verify session cookie was set
      expect(response.cookies.get("session_id")?.value).toBe("session-id-123");
    });

    it("should normalize email to lowercase", async () => {
      vi.mocked(isFirstUser).mockResolvedValue(true);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(hashPassword).mockResolvedValue("hashed-password");
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: "new-user-1",
        email: "test@example.com",
        passwordHash: "hashed-password",
        name: null,
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(createSession).mockResolvedValue("session-id");

      const request = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "TEST@EXAMPLE.COM", password: "password123" }),
      });

      await POST(request);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "test@example.com",
          }),
        })
      );
    });
  });
});
