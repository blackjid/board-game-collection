import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import prisma from "@/lib/prisma";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock auth functions
vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
  hashPassword: vi.fn(),
}));

import { requireAdmin, hashPassword } from "@/lib/auth";

describe("Users API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // GET /api/auth/users
  // ============================================================================

  describe("GET /api/auth/users", () => {
    it("should return 403 when not admin", async () => {
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return list of users when admin", async () => {
      const mockUsers = [
        {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin",
          role: "admin",
          createdAt: new Date("2024-01-01"),
        },
        {
          id: "user-2",
          email: "user@example.com",
          name: "User",
          role: "user",
          createdAt: new Date("2024-01-02"),
        },
      ];

      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
      });
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(2);
      expect(data.users[0].email).toBe("admin@example.com");
    });
  });

  // ============================================================================
  // POST /api/auth/users
  // ============================================================================

  describe("POST /api/auth/users", () => {
    it("should return 403 when not admin", async () => {
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden"));

      const request = new NextRequest("http://localhost:3000/api/auth/users", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", password: "password123" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 400 when email is missing", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/auth/users", {
        method: "POST",
        body: JSON.stringify({ password: "password123" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email and password are required");
    });

    it("should return 400 when password is too short", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/auth/users", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", password: "12345" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Password must be at least 6 characters");
    });

    it("should return 400 when role is invalid", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/auth/users", {
        method: "POST",
        body: JSON.stringify({
          email: "new@example.com",
          password: "password123",
          role: "superadmin",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid role");
    });

    it("should return 400 when email already exists", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "existing-user",
        email: "existing@example.com",
        name: null,
        role: "user",
        passwordHash: "hash",
        createdAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/auth/users", {
        method: "POST",
        body: JSON.stringify({ email: "existing@example.com", password: "password123" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email already in use");
    });

    it("should create user with default role 'user'", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(hashPassword).mockResolvedValue("hashed-password");
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: "new-user",
        email: "new@example.com",
        name: "New User",
        role: "user",
        passwordHash: "hashed-password",
        createdAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/auth/users", {
        method: "POST",
        body: JSON.stringify({
          email: "new@example.com",
          password: "password123",
          name: "New User",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.role).toBe("user");
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: "new@example.com",
          passwordHash: "hashed-password",
          name: "New User",
          role: "user",
        },
      });
    });

    it("should create admin user when role specified", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(hashPassword).mockResolvedValue("hashed-password");
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: "new-admin",
        email: "newadmin@example.com",
        name: "New Admin",
        role: "admin",
        passwordHash: "hashed-password",
        createdAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/auth/users", {
        method: "POST",
        body: JSON.stringify({
          email: "newadmin@example.com",
          password: "password123",
          name: "New Admin",
          role: "admin",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.role).toBe("admin");
    });
  });
});
