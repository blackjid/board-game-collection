-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScrapeJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "batchId" TEXT
);
INSERT INTO "new_ScrapeJob" ("completedAt", "createdAt", "error", "gameId", "gameName", "id", "startedAt", "status") SELECT "completedAt", "createdAt", "error", "gameId", "gameName", "id", "startedAt", "status" FROM "ScrapeJob";
DROP TABLE "ScrapeJob";
ALTER TABLE "new_ScrapeJob" RENAME TO "ScrapeJob";
CREATE INDEX "ScrapeJob_status_idx" ON "ScrapeJob"("status");
CREATE INDEX "ScrapeJob_gameId_idx" ON "ScrapeJob"("gameId");
CREATE INDEX "ScrapeJob_batchId_idx" ON "ScrapeJob"("batchId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
