// TypeScript interfaces for game play tracking

// ============================================================================
// Saved Location Types
// ============================================================================

export interface SavedLocationData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateSavedLocationInput {
  name: string;
  latitude: number;
  longitude: number;
}

// ============================================================================
// Game Play Types
// ============================================================================

export interface GamePlayPlayer {
  id: string;
  name: string;
  playerId?: string | null;
  isWinner: boolean;
}

export interface GamePlayData {
  id: string;
  gameId: string;
  loggedById: string;
  playedAt: Date | string;
  location: string | null;
  savedLocationId: string | null;
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
  savedLocation?: SavedLocationData | null;
}

export interface CreateGamePlayInput {
  gameId: string;
  playedAt?: Date | string;
  location?: string;
  savedLocationId?: string;
  duration?: number;
  notes?: string;
  players: {
    name: string;
    playerId?: string;
    isWinner?: boolean;
  }[];
}

export interface UpdateGamePlayInput {
  playedAt?: Date | string;
  location?: string;
  savedLocationId?: string | null;
  duration?: number;
  notes?: string;
  players?: {
    name: string;
    playerId?: string;
    isWinner?: boolean;
  }[];
}
