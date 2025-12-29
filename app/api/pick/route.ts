import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSettings } from "@/lib/sync";

interface GameData {
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
  isExpansion: boolean;
  categories: string[];
  mechanics: string[];
  componentImages: string[];
  availableImages: string[];
}

interface ExperienceStats {
  totalGames: number;
  avgRating: number;
  totalPlaytimeHours: number;
  oldestGame: GameData | null;
  newestGame: GameData | null;
  shortestGame: GameData | null;
  longestGame: GameData | null;
  topCategory: string | null;
  topMechanic: string | null;
  persona: string;
}

function parseJsonField(value: string | null): string[] {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

interface RawGame {
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
  isExpansion: boolean;
  categories: string | null;
  mechanics: string | null;
  componentImages: string | null;
  availableImages: string | null;
}

function transformGame(game: RawGame): GameData {
  // Use the main game image (box art), not component images
  // Priority: selectedThumbnail (user choice) > image (full size) > thumbnail
  const mainImage = game.selectedThumbnail || game.image || game.thumbnail;

  return {
    id: game.id,
    name: game.name,
    yearPublished: game.yearPublished,
    image: mainImage,
    thumbnail: game.thumbnail,
    selectedThumbnail: game.selectedThumbnail,
    description: game.description,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    minPlaytime: game.minPlaytime,
    maxPlaytime: game.maxPlaytime,
    rating: game.rating,
    minAge: game.minAge,
    isExpansion: game.isExpansion,
    categories: parseJsonField(game.categories),
    mechanics: parseJsonField(game.mechanics),
    componentImages: parseJsonField(game.componentImages),
    availableImages: parseJsonField(game.availableImages),
  };
}

function detectPersona(categoryCount: Record<string, number>): string {
  const sorted = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return "The Collector";

  const top = sorted[0][0].toLowerCase();

  if (top.includes("strategy")) return "The Strategist";
  if (top.includes("party")) return "The Party Host";
  if (top.includes("family")) return "The Family Gamer";
  if (top.includes("war") || top.includes("fighting")) return "The Commander";
  if (top.includes("adventure") || top.includes("exploration")) return "The Explorer";
  if (top.includes("puzzle") || top.includes("abstract")) return "The Puzzle Master";
  if (top.includes("economic") || top.includes("trading")) return "The Tycoon";
  if (top.includes("card")) return "The Card Shark";
  if (top.includes("cooperative") || top.includes("team")) return "The Team Player";
  if (top.includes("trivia") || top.includes("word")) return "The Quiz Master";
  if (top.includes("dice") || top.includes("racing")) return "The Risk Taker";
  if (top.includes("horror") || top.includes("fantasy")) return "The Storyteller";

  return "The Collector";
}

/**
 * GET /api/experience
 * Get all data needed for the experience page
 */
export async function GET() {
  const settings = await getSettings();

  // Fetch all active, scraped games
  const rawGames = await prisma.game.findMany({
    where: {
      isVisible: true,
      lastScraped: { not: null },
    },
    orderBy: { rating: "desc" },
  });

  const games = rawGames.map(transformGame);

  // Calculate stats
  const gamesWithRating = games.filter((g) => g.rating !== null);
  const avgRating =
    gamesWithRating.length > 0
      ? gamesWithRating.reduce((sum, g) => sum + (g.rating || 0), 0) / gamesWithRating.length
      : 0;

  // Total playtime potential
  const totalMinutes = games.reduce((sum, g) => {
    const avg =
      g.minPlaytime && g.maxPlaytime
        ? (g.minPlaytime + g.maxPlaytime) / 2
        : g.minPlaytime || g.maxPlaytime || 60;
    return sum + avg;
  }, 0);

  // Find extremes
  const gamesWithYear = games.filter((g) => g.yearPublished !== null);
  const oldestGame = gamesWithYear.reduce<GameData | null>(
    (oldest, g) =>
      !oldest || (g.yearPublished && g.yearPublished < (oldest.yearPublished || Infinity))
        ? g
        : oldest,
    null
  );
  const newestGame = gamesWithYear.reduce<GameData | null>(
    (newest, g) =>
      !newest || (g.yearPublished && g.yearPublished > (newest.yearPublished || 0)) ? g : newest,
    null
  );

  const gamesWithPlaytime = games.filter((g) => g.minPlaytime || g.maxPlaytime);
  const shortestGame = gamesWithPlaytime.reduce<GameData | null>((shortest, g) => {
    const time = g.minPlaytime || g.maxPlaytime || Infinity;
    const shortestTime = shortest?.minPlaytime || shortest?.maxPlaytime || Infinity;
    return !shortest || time < shortestTime ? g : shortest;
  }, null);
  const longestGame = gamesWithPlaytime.reduce<GameData | null>((longest, g) => {
    const time = g.maxPlaytime || g.minPlaytime || 0;
    const longestTime = longest?.maxPlaytime || longest?.minPlaytime || 0;
    return !longest || time > longestTime ? g : longest;
  }, null);

  // Count categories and mechanics
  const categoryCount: Record<string, number> = {};
  const mechanicCount: Record<string, number> = {};

  games.forEach((g) => {
    g.categories.forEach((cat) => {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    g.mechanics.forEach((mech) => {
      mechanicCount[mech] = (mechanicCount[mech] || 0) + 1;
    });
  });

  const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const topMechanic = Object.entries(mechanicCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const stats: ExperienceStats = {
    totalGames: games.length,
    avgRating: Math.round(avgRating * 10) / 10,
    totalPlaytimeHours: Math.round(totalMinutes / 60),
    oldestGame,
    newestGame,
    shortestGame,
    longestGame,
    topCategory,
    topMechanic,
    persona: detectPersona(categoryCount),
  };

  return NextResponse.json({
    collectionName: settings.collectionName || settings.bggUsername || "My",
    games,
    stats,
    topGames: games.slice(0, 12), // Top 12 for showcases
  });
}
