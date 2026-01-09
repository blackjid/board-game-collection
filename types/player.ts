// TypeScript interfaces for player management

export interface PlayerData {
  id: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  // Optional stats
  playCount?: number;
}

export interface CreatePlayerInput {
  displayName: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdatePlayerInput {
  displayName?: string;
  firstName?: string;
  lastName?: string;
}

export interface PlayerSearchResult {
  id: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
}
