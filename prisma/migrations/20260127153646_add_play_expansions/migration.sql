-- CreateTable
CREATE TABLE "GamePlayExpansion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    CONSTRAINT "GamePlayExpansion_playId_fkey" FOREIGN KEY ("playId") REFERENCES "GamePlay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GamePlayExpansion_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GamePlay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "loggedById" TEXT NOT NULL,
    "playedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT,
    "savedLocationId" TEXT,
    "duration" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GamePlay_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GamePlay_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GamePlay_savedLocationId_fkey" FOREIGN KEY ("savedLocationId") REFERENCES "SavedLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GamePlay" ("createdAt", "duration", "gameId", "id", "location", "loggedById", "notes", "playedAt", "savedLocationId", "updatedAt") SELECT "createdAt", "duration", "gameId", "id", "location", "loggedById", "notes", "playedAt", "savedLocationId", "updatedAt" FROM "GamePlay";
DROP TABLE "GamePlay";
ALTER TABLE "new_GamePlay" RENAME TO "GamePlay";
CREATE INDEX "GamePlay_gameId_idx" ON "GamePlay"("gameId");
CREATE INDEX "GamePlay_loggedById_idx" ON "GamePlay"("loggedById");
CREATE INDEX "GamePlay_playedAt_idx" ON "GamePlay"("playedAt");
CREATE INDEX "GamePlay_savedLocationId_idx" ON "GamePlay"("savedLocationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "GamePlayExpansion_playId_idx" ON "GamePlayExpansion"("playId");

-- CreateIndex
CREATE INDEX "GamePlayExpansion_gameId_idx" ON "GamePlayExpansion"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GamePlayExpansion_playId_gameId_key" ON "GamePlayExpansion"("playId", "gameId");
