-- Manual migration to convert old players to the new Player registry
-- Run this once after deploying the player autocomplete feature

-- Create Player records for all unique player names that don't have a playerId yet
INSERT INTO Player (id, displayName, createdAt, updatedAt)
SELECT 
  lower(hex(randomblob(16))) as id,
  name as displayName,
  datetime('now') as createdAt,
  datetime('now') as updatedAt
FROM (
  SELECT DISTINCT name
  FROM GamePlayPlayer
  WHERE playerId IS NULL
)
WHERE name NOT IN (SELECT displayName FROM Player);

-- Link existing GamePlayPlayer records to the newly created Player records
UPDATE GamePlayPlayer
SET playerId = (
  SELECT id FROM Player WHERE Player.displayName = GamePlayPlayer.name
)
WHERE playerId IS NULL;
