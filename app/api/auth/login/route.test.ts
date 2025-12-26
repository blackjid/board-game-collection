import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import prisma from "@/lib/prisma";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    session: {
      create: vi.fn(),
    },
  },
}));

// Mock auth functions
vi.mock("@/lib/auth", () => ({
  verifyPassword: vi.fn(),
  createSession: vi.fn(),
  setSessionCookie: vi.fn(),
}));

import { verifyPassword, createSession, setSessionCookie } from "@/lib/auth";

describe("Login API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // POST /api/auth/login
  // ============================================================================

  describe("POST /api/auth/login", () => {
    it("should return 400 when email is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ password: "password123" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email and password are required");
    });

    it("should return 400 when password is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email and password are required");
    });

    it("should return 401 when user is not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", password: "password123" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Invalid email or password");
    });

    it("should return 401 when password is invalid", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        passwordHash: "hashedpassword",
        name: "Test User",
        role: "user",
        createdAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(verifyPassword).mockResolvedValue(false);

      const request = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", password: "wrongpassword" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Invalid email or password");
    });

    it("should return user data on successful login", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        passwordHash: "hashedpassword",
        name: "Test User",
        role: "admin",
        createdAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(createSession).mockResolvedValue("session-id-123");
      vi.mocked(setSessionCookie).mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", password: "password123" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toEqual({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        role: "admin",
      });
      expect(createSession).toHaveBeenCalledWith("user-1");
      expect(setSessionCookie).toHaveBeenCalledWith("session-id-123");
    });

    it("should normalize email to lowercase", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        passwordHash: "hashedpassword",
        name: "Test User",
        role: "user",
        createdAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(verifyPassword).mockResolvedValue(true);
      vi.mocked(createSession).mockResolvedValue("session-id-123");
      vi.mocked(setSessionCookie).mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "TEST@EXAMPLE.COM", password: "password123" }),
      });

      await POST(request);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    });
  });
});
