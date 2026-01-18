-- AlterTable
ALTER TABLE "Collection" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Collection_isPublic_idx" ON "Collection"("isPublic");
