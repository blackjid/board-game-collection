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
}

export interface GamesData {
  username: string;
  fetchedAt: string;
  totalGames: number;
  games: Game[];
}
