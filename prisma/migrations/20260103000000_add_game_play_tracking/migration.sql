-- Add Game Play Tracking tables
-- Track actual game plays with players, winner, location, etc.

-- CreateTable GamePlay
CREATE TABLE "GamePlay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "loggedById" TEXT NOT NULL,
    "playedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT,
    "duration" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GamePlay_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GamePlay_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable GamePlayPlayer
CREATE TABLE "GamePlayPlayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GamePlayPlayer_playId_fkey" FOREIGN KEY ("playId") REFERENCES "GamePlay" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GamePlay_gameId_idx" ON "GamePlay"("gameId");
CREATE INDEX "GamePlay_loggedById_idx" ON "GamePlay"("loggedById");
CREATE INDEX "GamePlay_playedAt_idx" ON "GamePlay"("playedAt");
CREATE INDEX "GamePlayPlayer_playId_idx" ON "GamePlayPlayer"("playId");
