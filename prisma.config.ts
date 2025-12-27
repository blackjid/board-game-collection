// Prisma configuration file
// npm install --save-dev prisma dotenv
import path from "node:path";
import { defineConfig } from "prisma/config";

// Get database URL from environment variables
// Priority: DATABASE_URL > DATA_PATH/games.db > local prisma/dev.db
const getDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  if (process.env.DATA_PATH) {
    return `file:${process.env.DATA_PATH}/games.db`;
  }
  // Default for local development
  return `file:${path.join(__dirname, "prisma", "dev.db")}`;
};

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getDatabaseUrl(),
  },
});
