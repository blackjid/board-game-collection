-- Unified Collection Model Migration
-- This migration:
-- 1. Creates Collection and CollectionGame tables
-- 2. Migrates data from old schema to new collections
-- 3. Removes isActive and source from Game
-- 4. Removes sync settings from Settings (now in Collection)

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'manual',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "bggUsername" TEXT,
    "syncSchedule" TEXT NOT NULL DEFAULT 'manual',
    "autoScrapeNewGames" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CollectionGame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL DEFAULT 'manual',
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionGame_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollectionGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex (before data migration)
CREATE INDEX "Collection_name_idx" ON "Collection"("name");
CREATE INDEX "Collection_type_idx" ON "Collection"("type");
CREATE INDEX "Collection_isPrimary_idx" ON "Collection"("isPrimary");
CREATE INDEX "CollectionGame_collectionId_idx" ON "CollectionGame"("collectionId");
CREATE INDEX "CollectionGame_gameId_idx" ON "CollectionGame"("gameId");
CREATE UNIQUE INDEX "CollectionGame_collectionId_gameId_key" ON "CollectionGame"("collectionId", "gameId");

-- =============================================================================
-- DATA MIGRATION: Create primary collection from Settings and migrate visible games
-- =============================================================================

-- Create primary collection from existing Settings (if bggUsername exists, it's a bgg_sync type)
-- Use a random UUID for the collection ID
INSERT INTO "Collection" ("id", "name", "type", "isPrimary", "bggUsername", "syncSchedule", "autoScrapeNewGames", "lastSyncedAt", "createdAt", "updatedAt")
SELECT
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))) as id,
    COALESCE(s."collectionName", 'My Collection') as name,
    CASE WHEN s."bggUsername" IS NOT NULL AND s."bggUsername" != '' THEN 'bgg_sync' ELSE 'manual' END as type,
    1 as isPrimary,
    s."bggUsername",
    COALESCE(s."syncSchedule", 'manual') as syncSchedule,
    COALESCE(s."autoScrapeNewGames", 0) as autoScrapeNewGames,
    s."lastScheduledSync" as lastSyncedAt,
    CURRENT_TIMESTAMP as createdAt,
    CURRENT_TIMESTAMP as updatedAt
FROM "Settings" s
WHERE s."id" = 'default'
LIMIT 1;

-- If no Settings exist, create a default primary collection
INSERT INTO "Collection" ("id", "name", "type", "isPrimary", "createdAt", "updatedAt")
SELECT
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))) as id,
    'My Collection' as name,
    'manual' as type,
    1 as isPrimary,
    CURRENT_TIMESTAMP as createdAt,
    CURRENT_TIMESTAMP as updatedAt
WHERE NOT EXISTS (SELECT 1 FROM "Collection" WHERE "isPrimary" = 1);

-- Link all visible games to the primary collection
INSERT INTO "CollectionGame" ("id", "collectionId", "gameId", "addedBy", "addedAt")
SELECT
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))) as id,
    c.id as collectionId,
    g.id as gameId,
    CASE WHEN g.source = 'bgg_collection' THEN 'sync' ELSE 'manual' END as addedBy,
    g.createdAt as addedAt
FROM "Game" g
CROSS JOIN "Collection" c
WHERE g."isActive" = 1 AND c."isPrimary" = 1;

-- =============================================================================
-- SCHEMA CHANGES: Drop deprecated columns
-- =============================================================================

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Recreate Game table without isActive and source columns
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
INSERT INTO "new_Game" ("availableImages", "categories", "componentImages", "createdAt", "description", "id", "image", "isExpansion", "lastScraped", "maxPlayers", "maxPlaytime", "mechanics", "minAge", "minPlayers", "minPlaytime", "name", "rating", "selectedThumbnail", "thumbnail", "updatedAt", "yearPublished") SELECT "availableImages", "categories", "componentImages", "createdAt", "description", "id", "image", "isExpansion", "lastScraped", "maxPlayers", "maxPlaytime", "mechanics", "minAge", "minPlayers", "minPlaytime", "name", "rating", "selectedThumbnail", "thumbnail", "updatedAt", "yearPublished" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";

-- Recreate PickSession table with new fields
CREATE TABLE "new_PickSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'collaborative',
    "hostName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "filtersJson" TEXT NOT NULL,
    "gameIdsJson" TEXT NOT NULL,
    "finalResultsJson" TEXT,
    "winnerGameId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);
INSERT INTO "new_PickSession" ("code", "completedAt", "createdAt", "filtersJson", "gameIdsJson", "hostName", "id", "status") SELECT "code", "completedAt", "createdAt", "filtersJson", "gameIdsJson", "hostName", "id", "status" FROM "PickSession";
DROP TABLE "PickSession";
ALTER TABLE "new_PickSession" RENAME TO "PickSession";
CREATE UNIQUE INDEX "PickSession_code_key" ON "PickSession"("code");
CREATE INDEX "PickSession_code_idx" ON "PickSession"("code");
CREATE INDEX "PickSession_status_idx" ON "PickSession"("status");
CREATE INDEX "PickSession_type_idx" ON "PickSession"("type");
CREATE INDEX "PickSession_createdAt_idx" ON "PickSession"("createdAt");
CREATE INDEX "PickSession_winnerGameId_idx" ON "PickSession"("winnerGameId");

-- Recreate Settings table without sync settings (now in Collection)
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("id", "updatedAt") SELECT "id", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
