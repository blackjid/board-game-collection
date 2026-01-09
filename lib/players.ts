import prisma from "./prisma";
import type { PlayerData, CreatePlayerInput, UpdatePlayerInput, PlayerSearchResult } from "@/types/player";
import type { Player } from "@prisma/client";

/**
 * Transform Prisma Player to external PlayerData interface
 */
function transformPlayer(player: Player, playCount?: number): PlayerData {
  return {
    id: player.id,
    displayName: player.displayName,
    firstName: player.firstName,
    lastName: player.lastName,
    createdAt: player.createdAt,
    updatedAt: player.updatedAt,
    ...(playCount !== undefined && { playCount }),
  };
}

/**
 * Create a new player
 */
export async function createPlayer(input: CreatePlayerInput): Promise<PlayerData> {
  const player = await prisma.player.create({
    data: {
      displayName: input.displayName,
      firstName: input.firstName || null,
      lastName: input.lastName || null,
    },
  });

  return transformPlayer(player);
}

/**
 * Get a single player by ID
 */
export async function getPlayerById(playerId: string): Promise<PlayerData | null> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
  });

  if (!player) return null;

  // Get play count
  const playCount = await prisma.gamePlayPlayer.count({
    where: { playerId },
  });

  return transformPlayer(player, playCount);
}

/**
 * List all players with optional search and stats
 */
export async function listPlayers(search?: string): Promise<PlayerData[]> {
  const players = await prisma.player.findMany({
    where: search
      ? {
          OR: [
            { displayName: { contains: search } },
            { firstName: { contains: search } },
            { lastName: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { displayName: "asc" },
  });

  // Get play counts for all players
  const playerIds = players.map((p) => p.id);
  const playCounts = await prisma.gamePlayPlayer.groupBy({
    by: ["playerId"],
    where: { playerId: { in: playerIds } },
    _count: { id: true },
  });

  const playCountMap = new Map(
    playCounts.map((pc) => [pc.playerId, pc._count.id])
  );

  return players.map((player) =>
    transformPlayer(player, playCountMap.get(player.id) || 0)
  );
}

/**
 * Search players for autocomplete (lightweight)
 */
export async function searchPlayers(query: string): Promise<PlayerSearchResult[]> {
  const players = await prisma.player.findMany({
    where: {
      OR: [
        { displayName: { contains: query } },
        { firstName: { contains: query } },
        { lastName: { contains: query } },
      ],
    },
    select: {
      id: true,
      displayName: true,
      firstName: true,
      lastName: true,
    },
    orderBy: { displayName: "asc" },
    take: 10,
  });

  return players;
}

/**
 * Update a player
 */
export async function updatePlayer(
  playerId: string,
  input: UpdatePlayerInput
): Promise<PlayerData> {
  const player = await prisma.player.update({
    where: { id: playerId },
    data: {
      ...(input.displayName !== undefined && { displayName: input.displayName }),
      ...(input.firstName !== undefined && { firstName: input.firstName || null }),
      ...(input.lastName !== undefined && { lastName: input.lastName || null }),
    },
  });

  // Get play count
  const playCount = await prisma.gamePlayPlayer.count({
    where: { playerId },
  });

  return transformPlayer(player, playCount);
}

/**
 * Delete a player
 */
export async function deletePlayer(playerId: string): Promise<void> {
  await prisma.player.delete({
    where: { id: playerId },
  });
}

/**
 * Get play count for a player
 */
export async function getPlayCountForPlayer(playerId: string): Promise<number> {
  return prisma.gamePlayPlayer.count({
    where: { playerId },
  });
}

/**
 * Find player by exact displayName (for merging/deduplication)
 */
export async function findPlayerByDisplayName(displayName: string): Promise<PlayerData | null> {
  const player = await prisma.player.findFirst({
    where: { displayName: { equals: displayName } },
  });

  if (!player) return null;

  const playCount = await prisma.gamePlayPlayer.count({
    where: { playerId: player.id },
  });

  return transformPlayer(player, playCount);
}
