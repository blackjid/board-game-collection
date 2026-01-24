-- CreateTable
CREATE TABLE "SavedLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SavedLocation_name_idx" ON "SavedLocation"("name");

-- AlterTable
ALTER TABLE "GamePlay" ADD COLUMN "savedLocationId" TEXT;

-- CreateIndex
CREATE INDEX "GamePlay_savedLocationId_idx" ON "GamePlay"("savedLocationId");
