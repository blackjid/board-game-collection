// Production-compatible Prisma config (JavaScript)
// This is used in the Docker container for migrations

// Get database URL from environment variables
// Priority: DATABASE_URL > DATA_PATH/games.db > /data/games.db
const getDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const dataPath = process.env.DATA_PATH || "/data";
  return `file:${dataPath}/games.db`;
};

module.exports = {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getDatabaseUrl(),
  },
};
