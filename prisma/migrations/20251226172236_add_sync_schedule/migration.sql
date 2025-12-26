-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "collectionName" TEXT,
    "bggUsername" TEXT,
    "syncSchedule" TEXT NOT NULL DEFAULT 'manual',
    "autoScrapeNewGames" BOOLEAN NOT NULL DEFAULT false,
    "lastScheduledSync" DATETIME,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("bggUsername", "collectionName", "id", "updatedAt") SELECT "bggUsername", "collectionName", "id", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
