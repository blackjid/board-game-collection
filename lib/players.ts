import prisma from "./prisma";
import type { PlayerData, CreatePlayerInput, UpdatePlayerInput, PlayerSearchResult } from "@/types/player";
import type { Player } from "@prisma/client";

/**
 * Normalize a string for accent-insensitive search.
 * Removes diacritics (accents) and converts to lowercase.
 */
function normalizeForSearch(str: string | null): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Check if a player matches the search query (accent-insensitive)
 */
function playerMatchesQuery(player: { displayName: string; firstName: string | null; lastName: string | null }, query: string): boolean {
  const normalizedQuery = normalizeForSearch(query);
  return (
    normalizeForSearch(player.displayName).includes(normalizedQuery) ||
    normalizeForSearch(player.firstName).includes(normalizedQuery) ||
    normalizeForSearch(player.lastName).includes(normalizedQuery)
  );
}

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
 * Search is accent-insensitive (e.g., "Maria" matches "María")
 */
export async function listPlayers(search?: string): Promise<PlayerData[]> {
  // Fetch all players and filter in memory for accent-insensitive search
  const allPlayers = await prisma.player.findMany({
    orderBy: { displayName: "asc" },
  });

  // Filter by search query if provided (accent-insensitive)
  const players = search
    ? allPlayers.filter((player) => playerMatchesQuery(player, search))
    : allPlayers;

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
 * Search is accent-insensitive (e.g., "Maria" matches "María")
 */
export async function searchPlayers(query: string): Promise<PlayerSearchResult[]> {
  // Fetch all players and filter in memory for accent-insensitive search
  const allPlayers = await prisma.player.findMany({
    select: {
      id: true,
      displayName: true,
      firstName: true,
      lastName: true,
    },
    orderBy: { displayName: "asc" },
  });

  // Filter by query (accent-insensitive) and limit to 10 results
  return allPlayers
    .filter((player) => playerMatchesQuery(player, query))
    .slice(0, 10);
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
