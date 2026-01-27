// ============================================================================
// BGG Client Types
// ============================================================================

/**
 * Game details returned by the BGG API client
 */
export interface BggGameDetails {
  id: string;
  name: string;
  yearPublished: number | null;
  description: string | null;
  image: string | null;
  thumbnail: string | null;
  rating: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  minPlaytime: number | null;
  maxPlaytime: number | null;
  minAge: number | null;
  categories: string[];
  mechanics: string[];
  isExpansion: boolean;
  baseGameIds: string[];
  expansionIds: string[];
}

/**
 * Collection item returned when fetching a user's collection
 */
export interface BggCollectionItem {
  id: string;
  name: string;
  yearPublished: number | null;
  isExpansion: boolean;
}

/**
 * Search result from BGG
 */
export interface BggSearchResult {
  id: string;
  name: string;
  yearPublished: number | null;
  thumbnail: string | null;
  isExpansion: boolean;
}

/**
 * Hot/trending game item
 */
export interface BggHotItem {
  id: string;
  name: string;
  yearPublished: number | null;
  thumbnail: string | null;
}

/**
 * BGG Client interface - implemented by both GeekdoApiClient and XmlApi2Client
 */
export interface BggClient {
  /**
   * Get detailed information about a single game
   */
  getGameDetails(gameId: string): Promise<BggGameDetails | null>;

  /**
   * Get detailed information about multiple games
   * Note: XML API v2 limits to 20 games per request, so this may batch internally
   */
  getGamesDetails(gameIds: string[]): Promise<BggGameDetails[]>;

  /**
   * Get a user's owned collection
   */
  getCollection(username: string): Promise<BggCollectionItem[]>;

  /**
   * Get gallery images for a game (version/edition box art)
   * These are used for thumbnail selection (availableImages)
   */
  getGalleryImages(gameId: string): Promise<string[]>;

  /**
   * Search for games by name
   */
  search(query: string, limit?: number): Promise<BggSearchResult[]>;

  /**
   * Get hot/trending games
   */
  getHotGames(): Promise<BggHotItem[]>;

  /**
   * Get the client type identifier
   */
  readonly clientType: "geekdo" | "xmlapi2";
}

/**
 * Configuration options for the BGG client
 */
export interface BggClientConfig {
  /**
   * Bearer token for XML API v2 authentication
   */
  token?: string;

  /**
   * Rate limit delay in milliseconds (default: 5000 for XML API v2)
   */
  rateLimitMs?: number;
}
