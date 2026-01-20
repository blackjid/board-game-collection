-- AlterTable
ALTER TABLE "Collection" ADD COLUMN "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Collection_shareToken_key" ON "Collection"("shareToken");

-- CreateIndex
CREATE INDEX "Collection_shareToken_idx" ON "Collection"("shareToken");
