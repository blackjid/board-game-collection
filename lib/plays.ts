import prisma from "./prisma";
import type { GamePlayData, CreateGamePlayInput, UpdateGamePlayInput, SavedLocationData } from "@/types/play";
import type { GamePlay, GamePlayPlayer, GamePlayExpansion, Game, User, SavedLocation } from "@prisma/client";

type PrismaExpansionUsed = GamePlayExpansion & {
  game: Pick<Game, "id" | "name" | "thumbnail">;
};

type PrismaGamePlay = GamePlay & {
  players?: GamePlayPlayer[];
  expansionsUsed?: PrismaExpansionUsed[];
  game?: Pick<Game, "id" | "name" | "thumbnail"> | null;
  loggedBy?: Pick<User, "id" | "name" | "email"> | null;
  savedLocation?: SavedLocation | null;
};

type PrismaPlayer = Pick<GamePlayPlayer, "id" | "name" | "playerId" | "isWinner">;

/**
 * Transform Prisma SavedLocation to external interface
 */
function transformSavedLocation(location: SavedLocation): SavedLocationData {
  return {
    id: location.id,
    name: location.name,
    latitude: location.latitude,
    longitude: location.longitude,
    createdAt: location.createdAt,
    updatedAt: location.updatedAt,
  };
}

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
    savedLocationId: play.savedLocationId,
    duration: play.duration,
    notes: play.notes,
    players: play.players?.map((p: PrismaPlayer) => ({
      id: p.id,
      name: p.name,
      playerId: p.playerId,
      isWinner: p.isWinner,
    })) || [],
    expansionsUsed: play.expansionsUsed?.map((e) => ({
      id: e.game.id,
      name: e.game.name,
      thumbnail: e.game.thumbnail,
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
    savedLocation: play.savedLocation ? transformSavedLocation(play.savedLocation) : null,
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
      savedLocationId: input.savedLocationId || null,
      duration: input.duration || null,
      notes: input.notes || null,
      players: {
        create: input.players.map(p => ({
          name: p.name,
          playerId: p.playerId || null,
          isWinner: p.isWinner ?? false,
        })),
      },
      expansionsUsed: input.expansionIds && input.expansionIds.length > 0
        ? {
            create: input.expansionIds.map(gameId => ({ gameId })),
          }
        : undefined,
    },
    include: {
      players: true,
      expansionsUsed: {
        include: {
          game: {
            select: {
              id: true,
              name: true,
              thumbnail: true,
            },
          },
        },
      },
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
      savedLocation: true,
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
      expansionsUsed: {
        include: {
          game: {
            select: {
              id: true,
              name: true,
              thumbnail: true,
            },
          },
        },
      },
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
      savedLocation: true,
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
      expansionsUsed: {
        include: {
          game: {
            select: {
              id: true,
              name: true,
              thumbnail: true,
            },
          },
        },
      },
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
      savedLocation: true,
    },
    orderBy: { playedAt: "desc" },
    take: filters?.limit || 100,
  });

  return plays.map(transformGamePlay);
}

/**
 * Update a game play record
 * Admins can edit any play, regular users can only edit their own
 */
export async function updateGamePlay(
  playId: string,
  userId: string,
  input: UpdateGamePlayInput,
  isAdmin: boolean = false
): Promise<GamePlayData> {
  // First verify ownership (admins can edit any play)
  const existingPlay = await prisma.gamePlay.findUnique({
    where: { id: playId },
  });

  if (!existingPlay) {
    throw new Error("Play not found");
  }

  if (!isAdmin && existingPlay.loggedById !== userId) {
    throw new Error("Unauthorized: You can only edit your own plays");
  }

  // If updating players, delete old ones and create new ones
  if (input.players) {
    await prisma.gamePlayPlayer.deleteMany({
      where: { playId },
    });
  }

  // If updating expansions, delete old ones and create new ones
  if (input.expansionIds !== undefined) {
    await prisma.gamePlayExpansion.deleteMany({
      where: { playId },
    });
  }

  const play = await prisma.gamePlay.update({
    where: { id: playId },
    data: {
      ...(input.playedAt !== undefined && { playedAt: new Date(input.playedAt) }),
      ...(input.location !== undefined && { location: input.location || null }),
      ...(input.savedLocationId !== undefined && { savedLocationId: input.savedLocationId || null }),
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
      ...(input.expansionIds !== undefined && input.expansionIds.length > 0 && {
        expansionsUsed: {
          create: input.expansionIds.map(gameId => ({ gameId })),
        },
      }),
    },
    include: {
      players: true,
      expansionsUsed: {
        include: {
          game: {
            select: {
              id: true,
              name: true,
              thumbnail: true,
            },
          },
        },
      },
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
      savedLocation: true,
    },
  });

  return transformGamePlay(play);
}

/**
 * Delete a game play record
 * Admins can delete any play, regular users can only delete their own
 */
export async function deleteGamePlay(playId: string, userId: string, isAdmin: boolean = false): Promise<void> {
  // First verify ownership (admins can delete any play)
  const existingPlay = await prisma.gamePlay.findUnique({
    where: { id: playId },
  });

  if (!existingPlay) {
    throw new Error("Play not found");
  }

  if (!isAdmin && existingPlay.loggedById !== userId) {
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
