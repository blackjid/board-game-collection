-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "yearPublished" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gamesFound" INTEGER NOT NULL,
    "status" TEXT NOT NULL
);
