import prisma from "./prisma";

export interface GameData {
  id: string;
  name: string;
  yearPublished: number | null;
  image: string | null;
  thumbnail: string | null;
  selectedThumbnail: string | null;
  description: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  minPlaytime: number | null;
  maxPlaytime: number | null;
  rating: number | null;
  minAge: number | null;
  categories: string[];
  mechanics: string[];
  isExpansion: boolean;
  availableImages: string[];
  componentImages: string[];
}

function parseJsonArray(json: string | null): string[] {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function transformGame(game: Awaited<ReturnType<typeof prisma.game.findFirst>>): GameData | null {
  if (!game) return null;

  return {
    id: game.id,
    name: game.name,
    yearPublished: game.yearPublished,
    image: game.image,
    thumbnail: game.thumbnail,
    selectedThumbnail: game.selectedThumbnail,
    description: game.description,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    minPlaytime: game.minPlaytime,
    maxPlaytime: game.maxPlaytime,
    rating: game.rating,
    minAge: game.minAge,
    categories: parseJsonArray(game.categories),
    mechanics: parseJsonArray(game.mechanics),
    isExpansion: game.isExpansion,
    availableImages: parseJsonArray(game.availableImages),
    componentImages: parseJsonArray(game.componentImages),
  };
}

export async function getActiveGames(): Promise<GameData[]> {
  const games = await prisma.game.findMany({
    where: {
      isVisible: true,
      lastScraped: { not: null },
    },
    orderBy: { name: "asc" },
  });

  return games.map(transformGame).filter((g): g is GameData => g !== null);
}

export async function getGameById(id: string): Promise<GameData | null> {
  const game = await prisma.game.findUnique({
    where: { id },
  });

  return transformGame(game);
}

export async function getGameCount(): Promise<{ total: number; active: number }> {
  const [total, active] = await Promise.all([
    prisma.game.count(),
    prisma.game.count({ where: { isVisible: true, lastScraped: { not: null } } }),
  ]);

  return { total, active };
}

// Helper to get the display image (selectedThumbnail or fallback to image)
export function getDisplayImage(game: GameData): string | null {
  return game.selectedThumbnail || game.image || game.thumbnail;
}

export interface CollectionSettings {
  collectionName: string | null;
  bggUsername: string | null;
}

const DEFAULT_BGG_USERNAME = "";

export async function getCollectionSettings(): Promise<CollectionSettings> {
  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
  });

  return {
    collectionName: settings?.collectionName || null,
    bggUsername: settings?.bggUsername || DEFAULT_BGG_USERNAME,
  };
}

export interface LastSyncInfo {
  syncedAt: Date | null;
  gamesFound: number;
}

export async function getLastSyncInfo(): Promise<LastSyncInfo> {
  const lastSync = await prisma.syncLog.findFirst({
    where: { status: "success" },
    orderBy: { syncedAt: "desc" },
  });

  return {
    syncedAt: lastSync?.syncedAt || null,
    gamesFound: lastSync?.gamesFound || 0,
  };
}
