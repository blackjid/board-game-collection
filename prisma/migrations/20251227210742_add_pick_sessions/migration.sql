-- CreateTable
CREATE TABLE "PickSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "hostName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "filtersJson" TEXT NOT NULL,
    "gameIdsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "PickSessionPlayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'picking',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PickSessionPlayer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PickSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PickSessionVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PickSessionVote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PickSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PickSessionVote_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "PickSessionPlayer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PickSession_code_key" ON "PickSession"("code");

-- CreateIndex
CREATE INDEX "PickSession_code_idx" ON "PickSession"("code");

-- CreateIndex
CREATE INDEX "PickSession_status_idx" ON "PickSession"("status");

-- CreateIndex
CREATE INDEX "PickSessionPlayer_sessionId_idx" ON "PickSessionPlayer"("sessionId");

-- CreateIndex
CREATE INDEX "PickSessionVote_sessionId_idx" ON "PickSessionVote"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PickSessionVote_sessionId_playerId_gameId_key" ON "PickSessionVote"("sessionId", "playerId", "gameId");
