export interface Game {
  id: string;
  name: string;
  yearPublished: number | null;
  image: string;
  thumbnail: string;
  galleryImages: string[];
  minPlayers: number | null;
  maxPlayers: number | null;
  minPlaytime: number | null;
  maxPlaytime: number | null;
  rating: number | null;
  numPlays: number;
  // New fields (optional for backwards compatibility with existing data)
  description?: string | null;
  minAge?: number | null;
  communityAge?: number | null;
  bestPlayerCount?: number[] | null;
  categories?: string[];
  mechanics?: string[];
  usersRated?: number | null;
  isExpansion?: boolean;
}

export interface GamesData {
  username: string;
  fetchedAt: string;
  totalGames: number;
  games: Game[];
}
