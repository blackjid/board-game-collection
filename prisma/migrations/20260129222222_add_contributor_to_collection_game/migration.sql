-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CollectionGame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL DEFAULT 'manual',
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contributorId" TEXT,
    CONSTRAINT "CollectionGame_contributorId_fkey" FOREIGN KEY ("contributorId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CollectionGame_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollectionGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CollectionGame" ("addedAt", "addedBy", "collectionId", "gameId", "id") SELECT "addedAt", "addedBy", "collectionId", "gameId", "id" FROM "CollectionGame";
DROP TABLE "CollectionGame";
ALTER TABLE "new_CollectionGame" RENAME TO "CollectionGame";
CREATE INDEX "CollectionGame_collectionId_idx" ON "CollectionGame"("collectionId");
CREATE INDEX "CollectionGame_gameId_idx" ON "CollectionGame"("gameId");
CREATE INDEX "CollectionGame_contributorId_idx" ON "CollectionGame"("contributorId");
CREATE UNIQUE INDEX "CollectionGame_collectionId_gameId_key" ON "CollectionGame"("collectionId", "gameId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
