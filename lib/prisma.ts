import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get database URL from environment variables
// Priority: DATABASE_URL > DATA_PATH/games.db > local prisma/dev.db
const getDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  if (process.env.DATA_PATH) {
    return `file:${process.env.DATA_PATH}/games.db`;
  }
  // Default for local development - use absolute path based on this file's location
  // This works regardless of process.cwd()
  return `file:${path.resolve(__dirname, "..", "prisma", "dev.db")}`;
};

// Create libSQL adapter
const adapter = new PrismaLibSql({
  url: getDatabaseUrl(),
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
