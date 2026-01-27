import { chromium } from "playwright";
import type {
  BggClient,
  BggGameDetails,
  BggCollectionItem,
  BggSearchResult,
  BggHotItem,
} from "./types";

// ============================================================================
// Internal Types
// ============================================================================

interface GeekItemResponse {
  item?: {
    objectid?: string;
    name?: string;
    yearpublished?: string;
    subtype?: string;
    short_description?: string;
    description?: string;
    minplayers?: string;
    maxplayers?: string;
    minplaytime?: string;
    maxplaytime?: string;
    minage?: string;
    images?: {
      thumb?: string;
      square200?: string;
    };
    links?: {
      boardgamecategory?: Array<{ name: string }>;
      boardgamemechanic?: Array<{ name: string }>;
      expandsboardgame?: Array<{ objectid: string; name: string }>;
      boardgameexpansion?: Array<{ objectid: string; name: string }>;
    };
  };
}

interface DynamicInfoResponse {
  item?: {
    stats?: {
      average?: string;
    };
  };
}

interface ImagesResponse {
  images?: Array<{
    imageurl_lg?: string;
    imageurl?: string;
  }>;
}

interface HotnessItem {
  objectid: string;
  name: string;
  yearpublished?: string;
  subtype?: string;
  thumbnail?: string;
}

interface HotnessResponse {
  items?: HotnessItem[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Strip HTML tags from text
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Get Playwright launch options
 */
function getPlaywrightLaunchOptions() {
  return {
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--single-process",
      "--no-zygote",
    ],
  };
}

// ============================================================================
// GeekdoApiClient - Uses BGG's internal JSON API (api.geekdo.com)
// ============================================================================

/**
 * BGG Client implementation using the internal Geekdo JSON API
 * This is an unofficial API that may change without notice
 */
export class GeekdoApiClient implements BggClient {
  readonly clientType = "geekdo" as const;

  /**
   * Get detailed information about a single game
   */
  async getGameDetails(gameId: string): Promise<BggGameDetails | null> {
    try {
      // Fetch basic game info, dynamic stats, and images in parallel
      const [geekItemResponse, dynamicInfoResponse, galleryImages, pageData] =
        await Promise.all([
          fetch(
            `https://api.geekdo.com/api/geekitems?objecttype=thing&objectid=${gameId}`
          ),
          fetch(
            `https://api.geekdo.com/api/dynamicinfo?objectid=${gameId}&objecttype=thing`
          ),
          this.getGalleryImages(gameId),
          this.scrapeGamePage(gameId, false), // We'll update isExpansion after we know
        ]);

      const geekItemData: GeekItemResponse = await geekItemResponse.json();
      const dynamicData: DynamicInfoResponse = await dynamicInfoResponse.json();

      const item = geekItemData.item;
      if (!item) {
        return null;
      }

      const isExpansion = item.subtype === "boardgameexpansion";

      // If we guessed wrong about expansion type, re-scrape with correct type
      let image = pageData.image;
      if (isExpansion && !image) {
        const correctPageData = await this.scrapeGamePage(gameId, true);
        image = correctPageData.image;
      }

      // Parse description
      let description: string | null = null;
      if (item.short_description) {
        description = item.short_description;
      } else if (item.description) {
        let desc = stripHtml(item.description);
        if (desc.length > 500) {
          desc = desc.substring(0, 500).replace(/\s+\S*$/, "") + "...";
        }
        description = desc;
      }

      // Get rating from dynamic info
      let rating: number | null = null;
      const stats = dynamicData?.item?.stats;
      if (stats?.average) {
        rating = Math.round(parseFloat(stats.average) * 10) / 10;
      }

      // Extract categories and mechanics
      const categories = (item.links?.boardgamecategory || []).map(
        (c) => c.name
      );
      const mechanics = (item.links?.boardgamemechanic || []).map((m) => m.name);

      // Extract expansion relationships
      const baseGameIds = (item.links?.expandsboardgame || []).map(
        (e) => e.objectid
      );
      const expansionIds = (item.links?.boardgameexpansion || []).map(
        (e) => e.objectid
      );

      // Use first gallery image as fallback if no main image
      const finalImage = image || (galleryImages.length > 0 ? galleryImages[0] : null);

      return {
        id: gameId,
        name: item.name || "",
        yearPublished: item.yearpublished
          ? parseInt(item.yearpublished, 10)
          : null,
        description,
        image: finalImage,
        thumbnail: item.images?.square200 || item.images?.thumb || finalImage,
        rating,
        minPlayers: item.minplayers ? parseInt(item.minplayers, 10) : null,
        maxPlayers: item.maxplayers ? parseInt(item.maxplayers, 10) : null,
        minPlaytime: item.minplaytime ? parseInt(item.minplaytime, 10) : null,
        maxPlaytime: item.maxplaytime ? parseInt(item.maxplaytime, 10) : null,
        minAge: item.minage ? parseInt(item.minage, 10) : null,
        categories,
        mechanics,
        isExpansion,
        baseGameIds,
        expansionIds,
      };
    } catch (error) {
      console.error(`[GeekdoApiClient] Failed to get game details for ${gameId}:`, error);
      return null;
    }
  }

  /**
   * Get detailed information about multiple games
   */
  async getGamesDetails(gameIds: string[]): Promise<BggGameDetails[]> {
    const results: BggGameDetails[] = [];

    for (const gameId of gameIds) {
      const details = await this.getGameDetails(gameId);
      if (details) {
        results.push(details);
      }

      // Small delay between requests to be nice to BGG
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return results;
  }

  /**
   * Get a user's owned collection using Playwright scraping
   */
  async getCollection(username: string): Promise<BggCollectionItem[]> {
    const collectionUrl = `https://boardgamegeek.com/collection/user/${username}?own=1&subtype=boardgame&ff=1`;

    const browser = await chromium.launch(getPlaywrightLaunchOptions());

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(collectionUrl, { waitUntil: "networkidle" });
      await page.waitForSelector("table", { timeout: 30000 });

      const games = await page.evaluate(() => {
        const rows = document.querySelectorAll("table tbody tr");
        const gameList: BggCollectionItem[] = [];

        rows.forEach((row) => {
          const cells = row.querySelectorAll("td");
          if (cells.length < 5) return;

          const nameCell = cells[0];
          const link = nameCell.querySelector("a");
          if (!link) return;

          const name = link.textContent?.trim() || "";
          const href = link.getAttribute("href") || "";

          // Skip invalid entries
          if (
            !name ||
            name.includes("»") ||
            name.includes("Filters") ||
            name.length < 2
          ) {
            return;
          }

          // Extract game ID from href
          const idMatch = href.match(/\/(?:boardgame|boardgameexpansion)\/(\d+)/);
          const id = idMatch ? idMatch[1] : "";
          if (!id) return;

          // Check if it's an expansion
          const isExpansion = href.includes("boardgameexpansion");

          // Extract year
          const cellText = nameCell.textContent || "";
          const yearMatch = cellText.match(/\((\d{4})\)/);
          const yearPublished = yearMatch ? parseInt(yearMatch[1]) : null;

          gameList.push({ id, name, yearPublished, isExpansion });
        });

        return gameList;
      });

      return games;
    } finally {
      await browser.close();
    }
  }

  /**
   * Get gallery images for a game (version/edition box art)
   * Uses XML API v2 with versions=1 to get edition covers (same as XmlApi2Client)
   * This ensures consistency across both clients
   */
  async getGalleryImages(gameId: string): Promise<string[]> {
    try {
      const response = await fetch(
        `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&versions=1`
      );
      const xmlString = await response.text();

      // Simple XML parsing for version images
      const images = new Set<string>();

      // Extract main image
      const mainImageMatch = xmlString.match(/<image>([^<]+)<\/image>/);
      if (mainImageMatch) {
        images.add(mainImageMatch[1]);
      }

      // Extract version images
      const versionImageMatches = xmlString.matchAll(
        /<item[^>]*type="boardgameversion"[^>]*>[\s\S]*?<image>([^<]+)<\/image>[\s\S]*?<\/item>/g
      );
      for (const match of versionImageMatches) {
        images.add(match[1]);
      }

      return Array.from(images);
    } catch (error) {
      console.error(`[GeekdoApiClient] Gallery images error for ${gameId}:`, error);
      return [];
    }
  }

  /**
   * Search for games by name
   */
  async search(query: string, limit: number = 15): Promise<BggSearchResult[]> {
    try {
      // Try the BGG suggest/autocomplete API
      const suggestUrl = `https://boardgamegeek.com/search/boardgame?q=${encodeURIComponent(query)}&showcount=${limit}`;
      const suggestResponse = await fetch(suggestUrl, {
        headers: {
          Accept: "application/json",
        },
      });

      let items: HotnessItem[] = [];

      if (suggestResponse.ok) {
        try {
          const data: HotnessResponse = await suggestResponse.json();
          items = data.items || [];
        } catch {
          // Response might not be JSON, try alternative approach
        }
      }

      // If no items, try fetching from hotness as fallback
      if (items.length === 0) {
        const hotGames = await this.getHotGames();
        const queryLower = query.toLowerCase();
        return hotGames
          .filter((game) => game.name.toLowerCase().includes(queryLower))
          .slice(0, limit)
          .map((game) => ({
            id: game.id,
            name: game.name,
            yearPublished: game.yearPublished,
            thumbnail: game.thumbnail,
            isExpansion: false, // Hotness typically only includes base games
          }));
      }

      // Enrich items with additional details
      const results: BggSearchResult[] = await Promise.all(
        items.map(async (item): Promise<BggSearchResult> => {
          try {
            const detailResponse = await fetch(
              `https://api.geekdo.com/api/geekitems?objecttype=thing&objectid=${item.objectid}&nosession=1`
            );

            if (detailResponse.ok) {
              const detailData: GeekItemResponse = await detailResponse.json();
              const detail = detailData.item;

              if (detail) {
                return {
                  id: item.objectid,
                  name: detail.name || item.name,
                  yearPublished: detail.yearpublished
                    ? parseInt(detail.yearpublished, 10)
                    : item.yearpublished
                      ? parseInt(item.yearpublished, 10)
                      : null,
                  thumbnail:
                    detail.images?.square200 ||
                    detail.images?.thumb ||
                    item.thumbnail ||
                    null,
                  isExpansion:
                    detail.subtype === "boardgameexpansion" ||
                    item.subtype === "boardgameexpansion",
                };
              }
            }
          } catch {
            // Ignore errors, return basic info
          }

          // Return basic info if detail fetch fails
          return {
            id: item.objectid,
            name: item.name,
            yearPublished: item.yearpublished
              ? parseInt(item.yearpublished, 10)
              : null,
            thumbnail: item.thumbnail || null,
            isExpansion: item.subtype === "boardgameexpansion",
          };
        })
      );

      return results;
    } catch (error) {
      console.error("[GeekdoApiClient] Search failed:", error);
      return [];
    }
  }

  /**
   * Get hot/trending games
   */
  async getHotGames(): Promise<BggHotItem[]> {
    try {
      const response = await fetch(
        "https://api.geekdo.com/api/hotness?objecttype=thing&geeklists=0&objectid=0&nosession=1"
      );

      if (!response.ok) {
        return [];
      }

      const data: HotnessResponse = await response.json();
      const items = data.items || [];

      return items.map((item) => ({
        id: item.objectid,
        name: item.name,
        yearPublished: item.yearpublished
          ? parseInt(item.yearpublished, 10)
          : null,
        thumbnail: item.thumbnail || null,
      }));
    } catch (error) {
      console.error("[GeekdoApiClient] Hotness API error:", error);
      return [];
    }
  }

  /**
   * Scrape main image from game page using Playwright
   */
  private async scrapeGamePage(
    gameId: string,
    isExpansion: boolean
  ): Promise<{ image: string | null }> {
    const browser = await chromium.launch(getPlaywrightLaunchOptions());

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      const url = isExpansion
        ? `https://boardgamegeek.com/boardgameexpansion/${gameId}`
        : `https://boardgamegeek.com/boardgame/${gameId}`;

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

      const image = await page.evaluate(() => {
        const imgEl =
          document.querySelector('img[src*="cf.geekdo-images"][src*="itemrep"]') ||
          document.querySelector('img[src*="cf.geekdo-images"]:not([src*="avatar"])');
        return imgEl?.getAttribute("src") || null;
      });

      return { image };
    } catch (error) {
      console.error(`[GeekdoApiClient] Scrape error for ${gameId}:`, error);
      return { image: null };
    } finally {
      await browser.close();
    }
  }
}
