// TypeScript interfaces for game play tracking

export interface GamePlayPlayer {
  id: string;
  name: string;
  playerId?: string | null;
  isWinner: boolean;
  isNew: boolean;
}

export interface GamePlayData {
  id: string;
  gameId: string;
  loggedById: string;
  playedAt: Date | string;
  location: string | null;
  duration: number | null; // minutes
  notes: string | null;
  players: GamePlayPlayer[];
  // Optional related data for GET responses
  game?: {
    id: string;
    name: string;
    thumbnail: string | null;
  };
  loggedBy?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface CreateGamePlayInput {
  gameId: string;
  playedAt?: Date | string;
  location?: string;
  duration?: number;
  notes?: string;
  players: {
    name: string;
    playerId?: string;
    isWinner?: boolean;
    isNew?: boolean;
  }[];
}

export interface UpdateGamePlayInput {
  playedAt?: Date | string;
  location?: string;
  duration?: number;
  notes?: string;
  players?: {
    name: string;
    playerId?: string;
    isWinner?: boolean;
    isNew?: boolean;
  }[];
}
