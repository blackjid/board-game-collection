import { vi } from "vitest";
import "@testing-library/dom";
import "@testing-library/jest-dom/vitest";

// Mock Next.js modules that aren't available in test environment
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    settings: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    game: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    syncLog: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));
