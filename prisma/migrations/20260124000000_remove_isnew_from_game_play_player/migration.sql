-- Remove isNew column from GamePlayPlayer table
-- SQLite doesn't support DROP COLUMN directly, so we need to recreate the table

-- Create new table without isNew column
CREATE TABLE "new_GamePlayPlayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "playerId" TEXT,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GamePlayPlayer_playId_fkey" FOREIGN KEY ("playId") REFERENCES "GamePlay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GamePlayPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Copy data from old table to new table (excluding isNew)
INSERT INTO "new_GamePlayPlayer" ("id", "playId", "name", "playerId", "isWinner", "createdAt")
SELECT "id", "playId", "name", "playerId", "isWinner", "createdAt" FROM "GamePlayPlayer";

-- Drop old table
DROP TABLE "GamePlayPlayer";

-- Rename new table to original name
ALTER TABLE "new_GamePlayPlayer" RENAME TO "GamePlayPlayer";

-- Recreate indexes
CREATE INDEX "GamePlayPlayer_playId_idx" ON "GamePlayPlayer"("playId");
CREATE INDEX "GamePlayPlayer_playerId_idx" ON "GamePlayPlayer"("playerId");
