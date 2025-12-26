-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "collectionName" TEXT,
    "bggUsername" TEXT,
    "updatedAt" DATETIME NOT NULL
);
