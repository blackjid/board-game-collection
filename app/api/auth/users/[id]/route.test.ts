import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH, DELETE } from "./route";
import prisma from "@/lib/prisma";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      update: vi.fn(),
      delete: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
  },
}));

// Mock auth functions
vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
  hashPassword: vi.fn(),
  getCurrentUser: vi.fn(),
}));

import { requireAdmin, hashPassword } from "@/lib/auth";

describe("User [id] API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockParams = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  // ============================================================================
  // PATCH /api/auth/users/[id]
  // ============================================================================

  describe("PATCH /api/auth/users/[id]", () => {
    it("should return 403 when not admin", async () => {
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden"));

      const request = new NextRequest("http://localhost:3000/api/auth/users/user-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Name" }),
      });

      const response = await PATCH(request, createMockParams("user-1"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 400 when admin tries to remove own admin role", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/auth/users/admin-1", {
        method: "PATCH",
        body: JSON.stringify({ role: "user" }),
      });

      const response = await PATCH(request, createMockParams("admin-1"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("You cannot remove your own admin role");
    });

    it("should return 400 when role is invalid", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/auth/users/user-2", {
        method: "PATCH",
        body: JSON.stringify({ role: "superadmin" }),
      });

      const response = await PATCH(request, createMockParams("user-2"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid role");
    });

    it("should return 400 when password is too short", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/auth/users/user-2", {
        method: "PATCH",
        body: JSON.stringify({ password: "12345" }),
      });

      const response = await PATCH(request, createMockParams("user-2"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Password must be at least 6 characters");
    });

    it("should update user name", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: "user-2",
        email: "user@example.com",
        name: "Updated Name",
        role: "user",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/auth/users/user-2", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Name" }),
      });

      const response = await PATCH(request, createMockParams("user-2"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.name).toBe("Updated Name");
    });

    it("should update user role", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: "user-2",
        email: "user@example.com",
        name: "User",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/auth/users/user-2", {
        method: "PATCH",
        body: JSON.stringify({ role: "admin" }),
      });

      const response = await PATCH(request, createMockParams("user-2"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.role).toBe("admin");
    });

    it("should update user password", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(hashPassword).mockResolvedValue("new-hashed-password");
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: "user-2",
        email: "user@example.com",
        name: "User",
        role: "user",
        passwordHash: "new-hashed-password",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/auth/users/user-2", {
        method: "PATCH",
        body: JSON.stringify({ password: "newpassword123" }),
      });

      await PATCH(request, createMockParams("user-2"));

      expect(hashPassword).toHaveBeenCalledWith("newpassword123");
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: "new-hashed-password",
          }),
        })
      );
    });
  });

  // ============================================================================
  // DELETE /api/auth/users/[id]
  // ============================================================================

  describe("DELETE /api/auth/users/[id]", () => {
    it("should return 403 when not admin", async () => {
      vi.mocked(requireAdmin).mockRejectedValue(new Error("Forbidden"));

      const request = new NextRequest("http://localhost:3000/api/auth/users/user-1", {
        method: "DELETE",
      });

      const response = await DELETE(request, createMockParams("user-1"));
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 400 when admin tries to delete themselves", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/auth/users/admin-1", {
        method: "DELETE",
      });

      const response = await DELETE(request, createMockParams("admin-1"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("You cannot delete your own account");
    });

    it("should delete user and their sessions", async () => {
      vi.mocked(requireAdmin).mockResolvedValue({
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 2 });
      vi.mocked(prisma.user.delete).mockResolvedValue({
        id: "user-2",
        email: "user@example.com",
        name: "User",
        role: "user",
        passwordHash: "hash",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new NextRequest("http://localhost:3000/api/auth/users/user-2", {
        method: "DELETE",
      });

      const response = await DELETE(request, createMockParams("user-2"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-2" },
      });
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: "user-2" },
      });
    });
  });
});
