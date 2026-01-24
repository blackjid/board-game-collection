import prisma from "./prisma";
import type { GamePlayData, CreateGamePlayInput, UpdateGamePlayInput } from "@/types/play";
import type { GamePlay, GamePlayPlayer, Game, User } from "@prisma/client";

type PrismaGamePlay = GamePlay & {
  players?: GamePlayPlayer[];
  game?: Pick<Game, "id" | "name" | "thumbnail"> | null;
  loggedBy?: Pick<User, "id" | "name" | "email"> | null;
};

type PrismaPlayer = Pick<GamePlayPlayer, "id" | "name" | "playerId" | "isWinner">;

/**
 * Transform Prisma GamePlay to external GamePlayData interface
 */
function transformGamePlay(play: PrismaGamePlay): GamePlayData {
  return {
    id: play.id,
    gameId: play.gameId,
    loggedById: play.loggedById,
    playedAt: play.playedAt,
    location: play.location,
    duration: play.duration,
    notes: play.notes,
    players: play.players?.map((p: PrismaPlayer) => ({
      id: p.id,
      name: p.name,
      playerId: p.playerId,
      isWinner: p.isWinner,
    })) || [],
    game: play.game ? {
      id: play.game.id,
      name: play.game.name,
      thumbnail: play.game.thumbnail,
    } : undefined,
    loggedBy: play.loggedBy ? {
      id: play.loggedBy.id,
      name: play.loggedBy.name,
      email: play.loggedBy.email,
    } : undefined,
  };
}

/**
 * Create a new game play record
 */
export async function createGamePlay(
  userId: string,
  input: CreateGamePlayInput
): Promise<GamePlayData> {
  const play = await prisma.gamePlay.create({
    data: {
      gameId: input.gameId,
      loggedById: userId,
      playedAt: input.playedAt ? new Date(input.playedAt) : new Date(),
      location: input.location || null,
      duration: input.duration || null,
      notes: input.notes || null,
      players: {
        create: input.players.map(p => ({
          name: p.name,
          playerId: p.playerId || null,
          isWinner: p.isWinner ?? false,
        })),
      },
    },
    include: {
      players: true,
      game: {
        select: {
          id: true,
          name: true,
          thumbnail: true,
        },
      },
      loggedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return transformGamePlay(play);
}

/**
 * Get a single game play by ID
 */
export async function getGamePlayById(playId: string): Promise<GamePlayData | null> {
  const play = await prisma.gamePlay.findUnique({
    where: { id: playId },
    include: {
      players: true,
      game: {
        select: {
          id: true,
          name: true,
          thumbnail: true,
        },
      },
      loggedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!play) return null;
  return transformGamePlay(play);
}

/**
 * List game plays with optional filters
 */
export async function listGamePlays(filters?: {
  gameId?: string;
  userId?: string;
  limit?: number;
}): Promise<GamePlayData[]> {
  const plays = await prisma.gamePlay.findMany({
    where: {
      ...(filters?.gameId && { gameId: filters.gameId }),
      ...(filters?.userId && { loggedById: filters.userId }),
    },
    include: {
      players: true,
      game: {
        select: {
          id: true,
          name: true,
          thumbnail: true,
        },
      },
      loggedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { playedAt: "desc" },
    take: filters?.limit || 100,
  });

  return plays.map(transformGamePlay);
}

/**
 * Update a game play record
 */
export async function updateGamePlay(
  playId: string,
  userId: string,
  input: UpdateGamePlayInput
): Promise<GamePlayData> {
  // First verify ownership
  const existingPlay = await prisma.gamePlay.findUnique({
    where: { id: playId },
  });

  if (!existingPlay) {
    throw new Error("Play not found");
  }

  if (existingPlay.loggedById !== userId) {
    throw new Error("Unauthorized: You can only edit your own plays");
  }

  // If updating players, delete old ones and create new ones
  if (input.players) {
    await prisma.gamePlayPlayer.deleteMany({
      where: { playId },
    });
  }

  const play = await prisma.gamePlay.update({
    where: { id: playId },
    data: {
      ...(input.playedAt !== undefined && { playedAt: new Date(input.playedAt) }),
      ...(input.location !== undefined && { location: input.location || null }),
      ...(input.duration !== undefined && { duration: input.duration || null }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
      ...(input.players && {
        players: {
          create: input.players.map(p => ({
            name: p.name,
            playerId: p.playerId || null,
            isWinner: p.isWinner ?? false,
          })),
        },
      }),
    },
    include: {
      players: true,
      game: {
        select: {
          id: true,
          name: true,
          thumbnail: true,
        },
      },
      loggedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return transformGamePlay(play);
}

/**
 * Delete a game play record
 */
export async function deleteGamePlay(playId: string, userId: string): Promise<void> {
  // First verify ownership
  const existingPlay = await prisma.gamePlay.findUnique({
    where: { id: playId },
  });

  if (!existingPlay) {
    throw new Error("Play not found");
  }

  if (existingPlay.loggedById !== userId) {
    throw new Error("Unauthorized: You can only delete your own plays");
  }

  await prisma.gamePlay.delete({
    where: { id: playId },
  });
}

/**
 * Get play count for a game
 */
export async function getPlayCountForGame(gameId: string): Promise<number> {
  return prisma.gamePlay.count({
    where: { gameId },
  });
}

/**
 * Get play count for a user
 */
export async function getPlayCountForUser(userId: string): Promise<number> {
  return prisma.gamePlay.count({
    where: { loggedById: userId },
  });
}
