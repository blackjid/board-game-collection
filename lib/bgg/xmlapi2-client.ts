import { XMLParser } from "fast-xml-parser";
import type {
  BggClient,
  BggGameDetails,
  BggCollectionItem,
  BggSearchResult,
  BggHotItem,
} from "./types";

// ============================================================================
// XML API v2 Configuration
// ============================================================================

const BGG_API_BASE = "https://boardgamegeek.com/xmlapi2";
const DEFAULT_RATE_LIMIT_MS = 5000; // BGG recommends 5 second delay between requests
const MAX_THINGS_PER_REQUEST = 20; // BGG limits to 20 items per thing request
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// ============================================================================
// XML Parser Configuration
// ============================================================================

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  isArray: (tagName) => {
    // These elements can appear multiple times
    return ["item", "link", "name", "poll", "result", "results"].includes(tagName);
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// ============================================================================
// XmlApi2Client - Uses BGG's official XML API v2
// ============================================================================

/**
 * BGG Client implementation using the official XML API v2
 * Requires a registered application token
 *
 * @see https://boardgamegeek.com/wiki/page/BGG_XML_API2
 */
export class XmlApi2Client implements BggClient {
  readonly clientType = "xmlapi2" as const;

  private readonly token: string;
  private readonly rateLimitMs: number;
  private lastRequestTime = 0;

  constructor(token: string, rateLimitMs: number = DEFAULT_RATE_LIMIT_MS) {
    this.token = token;
    this.rateLimitMs = rateLimitMs;
  }

  /**
   * Make a rate-limited fetch request with authentication
   */
  private async rateLimitedFetch(url: string): Promise<Response> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.rateLimitMs) {
      await sleep(this.rateLimitMs - elapsed);
    }

    this.lastRequestTime = Date.now();

    return fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/xml",
      },
    });
  }

  /**
   * Fetch with retry logic for 202 (queued) and 5xx responses
   */
  private async fetchWithRetry(url: string): Promise<string | null> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const response = await this.rateLimitedFetch(url);

      if (response.status === 200) {
        return response.text();
      }

      if (response.status === 202) {
        // BGG is processing the request, need to retry
        console.log(
          `[XmlApi2Client] Request queued (202), retrying in ${RETRY_DELAY_MS}ms...`
        );
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      if (response.status >= 500) {
        // Server error, retry with backoff
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.log(
          `[XmlApi2Client] Server error (${response.status}), retrying in ${delay}ms...`
        );
        await sleep(delay);
        continue;
      }

      // Client error or other issue
      console.error(
        `[XmlApi2Client] Request failed with status ${response.status}: ${url}`
      );
      return null;
    }

    console.error(`[XmlApi2Client] Max retries exceeded for: ${url}`);
    return null;
  }

  /**
   * Parse XML response to JavaScript object
   */
  private parseXml(xmlString: string): unknown {
    try {
      return xmlParser.parse(xmlString);
    } catch (error) {
      console.error("[XmlApi2Client] XML parsing error:", error);
      return null;
    }
  }

  /**
   * Get detailed information about a single game
   */
  async getGameDetails(gameId: string): Promise<BggGameDetails | null> {
    const results = await this.getGamesDetails([gameId]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get detailed information about multiple games
   * Automatically batches requests to respect the 20 item limit
   */
  async getGamesDetails(gameIds: string[]): Promise<BggGameDetails[]> {
    const results: BggGameDetails[] = [];

    // Split into batches of MAX_THINGS_PER_REQUEST
    for (let i = 0; i < gameIds.length; i += MAX_THINGS_PER_REQUEST) {
      const batch = gameIds.slice(i, i + MAX_THINGS_PER_REQUEST);
      const batchResults = await this.fetchThingDetails(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Fetch thing details for a batch of game IDs
   */
  private async fetchThingDetails(gameIds: string[]): Promise<BggGameDetails[]> {
    const url = `${BGG_API_BASE}/thing?id=${gameIds.join(",")}&stats=1`;
    const xmlString = await this.fetchWithRetry(url);

    if (!xmlString) {
      return [];
    }

    const data = this.parseXml(xmlString) as {
      items?: { item?: ThingItem[] };
    } | null;

    if (!data?.items?.item) {
      return [];
    }

    const items = Array.isArray(data.items.item)
      ? data.items.item
      : [data.items.item];

    return items.map((item) => this.parseThingItem(item)).filter((x): x is BggGameDetails => x !== null);
  }

  /**
   * Parse a thing item from the XML response
   */
  private parseThingItem(item: ThingItem): BggGameDetails | null {
    try {
      const id = item["@_id"];
      const type = item["@_type"];

      if (!id) {
        return null;
      }

      // Get primary name
      const names = Array.isArray(item.name) ? item.name : item.name ? [item.name] : [];
      const primaryName = names.find((n) => n["@_type"] === "primary");
      const name = primaryName?.["@_value"] || names[0]?.["@_value"] || "";

      // Get year published
      const yearPublished = item.yearpublished?.["@_value"]
        ? parseInt(item.yearpublished["@_value"], 10)
        : null;

      // Get description (strip HTML)
      let description: string | null = null;
      if (item.description) {
        let desc = stripHtml(item.description);
        if (desc.length > 500) {
          desc = desc.substring(0, 500).replace(/\s+\S*$/, "") + "...";
        }
        description = desc;
      }

      // Get image and thumbnail
      const image = item.image || null;
      const thumbnail = item.thumbnail || null;

      // Get rating from statistics
      let rating: number | null = null;
      const average = item.statistics?.ratings?.average?.["@_value"];
      if (average) {
        rating = Math.round(parseFloat(average) * 10) / 10;
      }

      // Get player counts
      const minPlayers = item.minplayers?.["@_value"]
        ? parseInt(item.minplayers["@_value"], 10)
        : null;
      const maxPlayers = item.maxplayers?.["@_value"]
        ? parseInt(item.maxplayers["@_value"], 10)
        : null;

      // Get playtime
      const minPlaytime = item.minplaytime?.["@_value"]
        ? parseInt(item.minplaytime["@_value"], 10)
        : null;
      const maxPlaytime = item.maxplaytime?.["@_value"]
        ? parseInt(item.maxplaytime["@_value"], 10)
        : null;

      // Get minimum age
      const minAge = item.minage?.["@_value"]
        ? parseInt(item.minage["@_value"], 10)
        : null;

      // Get categories, mechanics, and expansion relationships from links
      const links = Array.isArray(item.link) ? item.link : item.link ? [item.link] : [];

      const categories = links
        .filter((l) => l["@_type"] === "boardgamecategory")
        .map((l) => l["@_value"]);

      const mechanics = links
        .filter((l) => l["@_type"] === "boardgamemechanic")
        .map((l) => l["@_value"]);

      const baseGameIds = links
        .filter((l) => l["@_type"] === "boardgameexpansion" && l["@_inbound"] === "true")
        .map((l) => l["@_id"]);

      const expansionIds = links
        .filter((l) => l["@_type"] === "boardgameexpansion" && l["@_inbound"] !== "true")
        .map((l) => l["@_id"]);

      const isExpansion = type === "boardgameexpansion";

      return {
        id,
        name,
        yearPublished,
        description,
        image,
        thumbnail,
        rating,
        minPlayers,
        maxPlayers,
        minPlaytime,
        maxPlaytime,
        minAge,
        categories,
        mechanics,
        isExpansion,
        baseGameIds,
        expansionIds,
      };
    } catch (error) {
      console.error("[XmlApi2Client] Error parsing thing item:", error);
      return null;
    }
  }

  /**
   * Get a user's owned collection
   */
  async getCollection(username: string): Promise<BggCollectionItem[]> {
    const url = `${BGG_API_BASE}/collection?username=${encodeURIComponent(username)}&own=1&stats=1`;
    const xmlString = await this.fetchWithRetry(url);

    if (!xmlString) {
      return [];
    }

    const data = this.parseXml(xmlString) as {
      items?: { item?: CollectionItem[] };
    } | null;

    if (!data?.items?.item) {
      return [];
    }

    const items = Array.isArray(data.items.item)
      ? data.items.item
      : [data.items.item];

    return items
      .map((item): BggCollectionItem | null => {
        try {
          const id = item["@_objectid"];
          const subtype = item["@_subtype"];

          if (!id) {
            return null;
          }

          // Handle different name formats:
          // - Array: [{ "#text": "Gloomhaven" }] or ["Gloomhaven"]
          // - Simple text: "Gloomhaven"
          // - Object with text: { "#text": "Gloomhaven", "@_sortindex": "1" }
          let name = "";
          const nameValue = Array.isArray(item.name) ? item.name[0] : item.name;
          if (typeof nameValue === "string") {
            name = nameValue;
          } else if (nameValue && typeof nameValue === "object") {
            name = nameValue["#text"] || nameValue["@_value"] || "";
          }

          // Handle yearpublished as array, number, string, or object
          let yearPublished: number | null = null;
          const yearValue = Array.isArray(item.yearpublished) ? item.yearpublished[0] : item.yearpublished;
          if (typeof yearValue === "number") {
            yearPublished = yearValue;
          } else if (typeof yearValue === "string") {
            yearPublished = parseInt(yearValue, 10);
          } else if (yearValue && typeof yearValue === "object") {
            const yearStr = yearValue["#text"] || yearValue["@_value"] || "";
            yearPublished = yearStr ? parseInt(String(yearStr), 10) : null;
          }
          if (yearPublished === 0) {
            yearPublished = null;
          }

          return {
            id,
            name,
            yearPublished: yearPublished === 0 ? null : yearPublished,
            isExpansion: subtype === "boardgameexpansion",
          };
        } catch (error) {
          console.error("[XmlApi2Client] Error parsing collection item:", error);
          return null;
        }
      })
      .filter((x): x is BggCollectionItem => x !== null);
  }

  /**
   * Get gallery images for a game (version/edition box art)
   * Uses versions=1 parameter to get images for all editions/versions
   * These are used for thumbnail selection (availableImages)
   */
  async getGalleryImages(gameId: string): Promise<string[]> {
    const url = `${BGG_API_BASE}/thing?id=${gameId}&versions=1`;
    const xmlString = await this.fetchWithRetry(url);

    if (!xmlString) {
      return [];
    }

    const data = this.parseXml(xmlString) as {
      items?: {
        item?: {
          image?: string;
          versions?: {
            item?: VersionItem[] | VersionItem;
          };
        }[];
      };
    } | null;

    if (!data?.items?.item) {
      return [];
    }

    const items = Array.isArray(data.items.item)
      ? data.items.item
      : [data.items.item];

    const images = new Set<string>();

    for (const item of items) {
      // Add main game image
      if (item.image) {
        images.add(item.image);
      }

      // Add version images
      if (item.versions?.item) {
        const versions = Array.isArray(item.versions.item)
          ? item.versions.item
          : [item.versions.item];

        for (const version of versions) {
          if (version.image) {
            images.add(version.image);
          }
        }
      }
    }

    return Array.from(images);
  }

  /**
   * Search for games by name
   */
  async search(query: string, limit: number = 15): Promise<BggSearchResult[]> {
    const url = `${BGG_API_BASE}/search?query=${encodeURIComponent(query)}&type=boardgame,boardgameexpansion`;
    const xmlString = await this.fetchWithRetry(url);

    if (!xmlString) {
      return [];
    }

    const data = this.parseXml(xmlString) as {
      items?: { item?: SearchItem[] };
    } | null;

    if (!data?.items?.item) {
      return [];
    }

    const items = Array.isArray(data.items.item)
      ? data.items.item
      : [data.items.item];

    // Limit results
    const limitedItems = items.slice(0, limit);

    // Search results don't include thumbnails, need to fetch from thing API
    // For efficiency, we batch fetch details for all items
    const gameIds = limitedItems.map((item) => item["@_id"]).filter(Boolean);
    const details = await this.getGamesDetails(gameIds);
    const detailsMap = new Map(details.map((d) => [d.id, d]));

    return limitedItems
      .map((item): BggSearchResult | null => {
        try {
          const id = item["@_id"];
          const type = item["@_type"];

          if (!id) {
            return null;
          }

          // Get name from name element
          const names = Array.isArray(item.name) ? item.name : item.name ? [item.name] : [];
          const primaryName = names.find((n) => n["@_type"] === "primary");
          const name = primaryName?.["@_value"] || names[0]?.["@_value"] || "";

          const yearPublished = item.yearpublished?.["@_value"]
            ? parseInt(item.yearpublished["@_value"], 10)
            : null;

          // Get thumbnail from cached details
          const gameDetails = detailsMap.get(id);

          return {
            id,
            name,
            yearPublished,
            thumbnail: gameDetails?.thumbnail || null,
            isExpansion: type === "boardgameexpansion",
          };
        } catch (error) {
          console.error("[XmlApi2Client] Error parsing search item:", error);
          return null;
        }
      })
      .filter((x): x is BggSearchResult => x !== null);
  }

  /**
   * Get hot/trending games
   */
  async getHotGames(): Promise<BggHotItem[]> {
    const url = `${BGG_API_BASE}/hot?type=boardgame`;
    const xmlString = await this.fetchWithRetry(url);

    if (!xmlString) {
      return [];
    }

    const data = this.parseXml(xmlString) as {
      items?: { item?: HotItem[] };
    } | null;

    if (!data?.items?.item) {
      return [];
    }

    const items = Array.isArray(data.items.item)
      ? data.items.item
      : [data.items.item];

    return items
      .map((item): BggHotItem | null => {
        try {
          const id = item["@_id"];

          if (!id) {
            return null;
          }

          // Handle name as array (from isArray config) or single object
          let name = "";
          if (Array.isArray(item.name)) {
            name = item.name[0]?.["@_value"] || "";
          } else if (item.name) {
            name = item.name["@_value"] || "";
          }

          // Handle yearpublished as array or single object
          let yearPublished: number | null = null;
          if (Array.isArray(item.yearpublished)) {
            yearPublished = item.yearpublished[0]?.["@_value"]
              ? parseInt(item.yearpublished[0]["@_value"], 10)
              : null;
          } else if (item.yearpublished?.["@_value"]) {
            yearPublished = parseInt(item.yearpublished["@_value"], 10);
          }

          // Handle thumbnail as array or single object
          let thumbnail: string | null = null;
          if (Array.isArray(item.thumbnail)) {
            thumbnail = item.thumbnail[0]?.["@_value"] || null;
          } else if (item.thumbnail) {
            thumbnail = item.thumbnail["@_value"] || null;
          }

          return {
            id,
            name,
            yearPublished,
            thumbnail,
          };
        } catch (error) {
          console.error("[XmlApi2Client] Error parsing hot item:", error);
          return null;
        }
      })
      .filter((x): x is BggHotItem => x !== null);
  }
}

// ============================================================================
// XML Response Types (internal)
// ============================================================================

interface ThingItem {
  "@_id": string;
  "@_type": string;
  name?: { "@_type": string; "@_value": string }[] | { "@_type": string; "@_value": string };
  yearpublished?: { "@_value": string };
  description?: string;
  image?: string;
  thumbnail?: string;
  minplayers?: { "@_value": string };
  maxplayers?: { "@_value": string };
  minplaytime?: { "@_value": string };
  maxplaytime?: { "@_value": string };
  minage?: { "@_value": string };
  link?: ThingLink[] | ThingLink;
  statistics?: {
    ratings?: {
      average?: { "@_value": string };
    };
  };
}

interface ThingLink {
  "@_type": string;
  "@_id": string;
  "@_value": string;
  "@_inbound"?: string;
}

interface CollectionItem {
  "@_objectid": string;
  "@_subtype": string;
  name?: string | { "#text": string };
  yearpublished?: string | { "#text": string };
}

interface SearchItem {
  "@_id": string;
  "@_type": string;
  name?: { "@_type": string; "@_value": string }[] | { "@_type": string; "@_value": string };
  yearpublished?: { "@_value": string };
}

interface HotItem {
  "@_id": string;
  name?: { "@_value": string }[] | { "@_value": string };
  yearpublished?: { "@_value": string }[] | { "@_value": string };
  thumbnail?: { "@_value": string }[] | { "@_value": string };
}

interface VersionItem {
  "@_id": string;
  image?: string;
  thumbnail?: string;
}
