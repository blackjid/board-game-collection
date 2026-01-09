-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GamePlayPlayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "playerId" TEXT,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GamePlayPlayer_playId_fkey" FOREIGN KEY ("playId") REFERENCES "GamePlay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GamePlayPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GamePlayPlayer" ("id", "playId", "name", "isWinner", "isNew", "createdAt") SELECT "id", "playId", "name", "isWinner", "isNew", "createdAt" FROM "GamePlayPlayer";
DROP TABLE "GamePlayPlayer";
ALTER TABLE "new_GamePlayPlayer" RENAME TO "GamePlayPlayer";
CREATE INDEX "GamePlayPlayer_playId_idx" ON "GamePlayPlayer"("playId");
CREATE INDEX "GamePlayPlayer_playerId_idx" ON "GamePlayPlayer"("playerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Player_displayName_idx" ON "Player"("displayName");
