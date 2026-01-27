// ============================================================================
// BGG Client - Public API
// ============================================================================

// Types
export type {
  BggClient,
  BggClientConfig,
  BggGameDetails,
  BggCollectionItem,
  BggSearchResult,
  BggHotItem,
} from "./types";

// Client factory
export { getBggClient, resetBggClient, isBggConfigured } from "./client";

// Client implementation (for advanced usage)
export { XmlApi2Client } from "./xmlapi2-client";
