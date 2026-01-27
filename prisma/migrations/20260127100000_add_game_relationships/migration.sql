-- CreateTable: GameRelationship for many-to-many game relationships
CREATE TABLE IF NOT EXISTS "GameRelationship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromGameId" TEXT NOT NULL,
    "toGameId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    CONSTRAINT "GameRelationship_fromGameId_fkey" FOREIGN KEY ("fromGameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameRelationship_toGameId_fkey" FOREIGN KEY ("toGameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- NOTE: Data migration from baseGameId to GameRelationship is handled by the scraper
-- when games are re-scraped. The baseGameId column may not exist in all databases
-- (it was removed in some environments before this migration was created).
-- The scraper will create GameRelationship records during the next sync.

-- CreateIndex (IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS "GameRelationship_fromGameId_idx" ON "GameRelationship"("fromGameId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GameRelationship_toGameId_idx" ON "GameRelationship"("toGameId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GameRelationship_type_idx" ON "GameRelationship"("type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GameRelationship_fromGameId_toGameId_type_key" ON "GameRelationship"("fromGameId", "toGameId", "type");

-- DropIndex (IF EXISTS - may not exist in all databases)
DROP INDEX IF EXISTS "Game_baseGameId_idx";

-- Ensure Game table has correct schema (without baseGameId)
-- Using new_Game pattern for SQLite table alteration
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE IF NOT EXISTS "new_Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "yearPublished" INTEGER,
    "lastScraped" DATETIME,
    "image" TEXT,
    "thumbnail" TEXT,
    "description" TEXT,
    "minPlayers" INTEGER,
    "maxPlayers" INTEGER,
    "minPlaytime" INTEGER,
    "maxPlaytime" INTEGER,
    "rating" REAL,
    "minAge" INTEGER,
    "categories" TEXT,
    "mechanics" TEXT,
    "isExpansion" BOOLEAN NOT NULL DEFAULT false,
    "availableImages" TEXT,
    "selectedThumbnail" TEXT,
    "componentImages" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT OR REPLACE INTO "new_Game" ("id", "name", "yearPublished", "lastScraped", "image", "thumbnail", "description", "minPlayers", "maxPlayers", "minPlaytime", "maxPlaytime", "rating", "minAge", "categories", "mechanics", "isExpansion", "availableImages", "selectedThumbnail", "componentImages", "createdAt", "updatedAt")
SELECT "id", "name", "yearPublished", "lastScraped", "image", "thumbnail", "description", "minPlayers", "maxPlayers", "minPlaytime", "maxPlaytime", "rating", "minAge", "categories", "mechanics", "isExpansion", "availableImages", "selectedThumbnail", "componentImages", "createdAt", "updatedAt" FROM "Game" WHERE true;
DROP TABLE IF EXISTS "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
