-- Add automatic list configuration fields to Collection
ALTER TABLE "Collection" ADD COLUMN "autoRuleType" TEXT;
ALTER TABLE "Collection" ADD COLUMN "autoRuleConfig" TEXT;

-- Create index for autoRuleType
CREATE INDEX "Collection_autoRuleType_idx" ON "Collection"("autoRuleType");

-- Seed the "Top 10 Played" automatic collection
INSERT INTO "Collection" (
  "id",
  "name",
  "slug",
  "description",
  "type",
  "isPrimary",
  "isPublic",
  "syncSchedule",
  "autoScrapeNewGames",
  "autoRuleType",
  "autoRuleConfig",
  "createdAt",
  "updatedAt"
) VALUES (
  'auto-top-played',
  'Top 10 Played',
  'top-played',
  'Your most played games based on logged play sessions',
  'automatic',
  0,
  0,
  'manual',
  0,
  'top_played',
  '{"limit": 10}',
  datetime('now'),
  datetime('now')
);
