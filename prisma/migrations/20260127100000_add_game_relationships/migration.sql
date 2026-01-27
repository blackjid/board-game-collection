-- CreateTable: GameRelationship for many-to-many game relationships
CREATE TABLE "GameRelationship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromGameId" TEXT NOT NULL,
    "toGameId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    CONSTRAINT "GameRelationship_fromGameId_fkey" FOREIGN KEY ("fromGameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameRelationship_toGameId_fkey" FOREIGN KEY ("toGameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Migrate existing baseGameId data to GameRelationship table
INSERT INTO "GameRelationship" ("id", "fromGameId", "toGameId", "type")
SELECT 
    lower(hex(randomblob(12))),
    "id",
    "baseGameId",
    'expands'
FROM "Game"
WHERE "baseGameId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "GameRelationship_fromGameId_idx" ON "GameRelationship"("fromGameId");

-- CreateIndex
CREATE INDEX "GameRelationship_toGameId_idx" ON "GameRelationship"("toGameId");

-- CreateIndex
CREATE INDEX "GameRelationship_type_idx" ON "GameRelationship"("type");

-- CreateIndex
CREATE UNIQUE INDEX "GameRelationship_fromGameId_toGameId_type_key" ON "GameRelationship"("fromGameId", "toGameId", "type");

-- DropIndex
DROP INDEX IF EXISTS "Game_baseGameId_idx";

-- AlterTable: Remove deprecated baseGameId column
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
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
INSERT INTO "new_Game" ("id", "name", "yearPublished", "lastScraped", "image", "thumbnail", "description", "minPlayers", "maxPlayers", "minPlaytime", "maxPlaytime", "rating", "minAge", "categories", "mechanics", "isExpansion", "availableImages", "selectedThumbnail", "componentImages", "createdAt", "updatedAt")
SELECT "id", "name", "yearPublished", "lastScraped", "image", "thumbnail", "description", "minPlayers", "maxPlayers", "minPlaytime", "maxPlaytime", "rating", "minAge", "categories", "mechanics", "isExpansion", "availableImages", "selectedThumbnail", "componentImages", "createdAt", "updatedAt" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
