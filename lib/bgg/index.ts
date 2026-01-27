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
export {
  getBggClient,
  resetBggClient,
  isXmlApiAvailable,
  getClientType,
} from "./client";

// Client implementations (for advanced usage)
export { GeekdoApiClient } from "./geekdo-client";
export { XmlApi2Client } from "./xmlapi2-client";
