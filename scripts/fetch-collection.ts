import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { Game, GamesData } from "../types/game";

const BGG_USERNAME = "jidonoso";
const COLLECTION_URL = `https://boardgamegeek.com/collection/user/${BGG_USERNAME}?own=1&subtype=boardgame&ff=1`;

// Note: BGG image URLs have size-specific hashes that cannot be converted.
// To get original URLs, we must navigate to the image page and extract them directly.

interface GameDetails {
  image: string;
  galleryImages: string[];
  bggRating: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  minPlaytime: number | null;
  maxPlaytime: number | null;
}

async function fetchGameImage(page: any, game: any): Promise<GameDetails> {
  // Extract game details from the current page
  return await page.evaluate(() => {
    // Get the main game image - try multiple selectors
    const imgEl = document.querySelector('img[src*="cf.geekdo-images"][src*="itemrep"]') ||
                 document.querySelector('img[src*="cf.geekdo-images"]:not([src*="avatar"])') ||
                 document.querySelector('.game-header-image img') ||
                 document.querySelector('[class*="primary"] img[src*="geekdo"]');
    const image = imgEl?.getAttribute("src") || "";

    // Get gallery images - look for thumbnails and other game images
    const galleryImages: string[] = [];
    const allImages = document.querySelectorAll('img[src*="cf.geekdo-images"]');
    allImages.forEach((img) => {
      const src = img.getAttribute("src") || "";
      // Filter for game-related images (not avatars, icons, etc.)
      if (src &&
          !src.includes("avatar") &&
          !src.includes("icon") &&
          !src.includes("logo") &&
          src.includes("/pic")) {
        // Keep the original URL but try to get a larger version
        // BGG URL format: https://cf.geekdo-images.com/HASH__SIZE/img/HASH2/picNNNN.ext
        // Replace small sizes with larger ones
        let fullSrc = src
          .replace(/__square\d+\//, "__imagepagezoom/")
          .replace(/__thumb\//, "__imagepagezoom/")
          .replace(/__micro\//, "__imagepagezoom/")
          .replace(/__small\//, "__imagepagezoom/");

        if (!galleryImages.includes(fullSrc) && fullSrc !== image && !galleryImages.includes(src)) {
          galleryImages.push(fullSrc);
        }
      }
    });

    // Try to get player count and playtime from the game info section
    const infoText = document.body.textContent || "";

    // Look for player count pattern like "2-4 Players" or "2–4"
    const playerMatch = infoText.match(/(\d+)[–-](\d+)\s*Player/i);
    const minPlayers = playerMatch ? parseInt(playerMatch[1]) : null;
    const maxPlayers = playerMatch ? parseInt(playerMatch[2]) : null;

    // Look for playtime pattern like "30-60 Min"
    const timeMatch = infoText.match(/(\d+)[–-](\d+)\s*Min/i);
    const minPlaytime = timeMatch ? parseInt(timeMatch[1]) : null;
    const maxPlaytime = timeMatch ? parseInt(timeMatch[2]) : null;

    // Get BGG average rating - look for the rating display on the page
    let bggRating: number | null = null;

    // Method 1: Look for JSON-LD data which often contains the rating
    const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
    if (jsonLdScript) {
      try {
        const jsonData = JSON.parse(jsonLdScript.textContent || "");
        if (jsonData.aggregateRating?.ratingValue) {
          bggRating = Math.round(parseFloat(jsonData.aggregateRating.ratingValue) * 10) / 10;
        }
      } catch (e) {}
    }

    // Method 2: Look for the rating value in various possible selectors
    if (!bggRating) {
      const ratingSelectors = [
        '[class*="rating-overall"] [class*="value"]',
        '[class*="RatingModule"] [class*="value"]',
        '[class*="geekrating"]',
        '.geekrating',
        '[itemprop="ratingValue"]',
        'span[class*="primary"]'
      ];

      for (const selector of ratingSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          const text = el.textContent?.trim() || "";
          const parsed = parseFloat(text);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
            bggRating = Math.round(parsed * 10) / 10;
            break;
          }
        }
      }
    }

    // Method 3: Look for rating pattern in page text
    if (!bggRating) {
      // Look for patterns like "7.8" or "8.0" near "rating" text
      const ratingMatch = infoText.match(/(?:rating|score)[^\d]*(\d+\.?\d*)/i) ||
                          infoText.match(/(\d+\.\d+)\s*\/\s*10/) ||
                          infoText.match(/(\d+\.\d{1,2})(?:\s|$)/);
      if (ratingMatch) {
        const parsed = parseFloat(ratingMatch[1]);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
          bggRating = Math.round(parsed * 10) / 10;
        }
      }
    }

    return { image, galleryImages: galleryImages.slice(0, 5), bggRating, minPlayers, maxPlayers, minPlaytime, maxPlaytime };
  });
}

interface ExtendedGameData {
  rating: number | null;
  description: string | null;
  minAge: number | null;
  communityAge: number | null;
  bestPlayerCount: number[] | null;
  categories: string[];
  mechanics: string[];
  usersRated: number | null;
  isExpansion: boolean;
  minPlayers: number | null;
  maxPlayers: number | null;
  minPlaytime: number | null;
  maxPlaytime: number | null;
}

// Strip HTML tags from text
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Fetch gallery images from BGG's internal API
async function fetchGalleryImagesFromAPI(gameId: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://api.geekdo.com/api/images?ajax=1&foritempage=1&galleries[]=game&nosession=1&objectid=${gameId}&objecttype=thing&showcount=10&size=original&sort=hot`
    );
    const data = await response.json();
    const images = data.images || [];

    // Get the large/original URLs, skip the first one (usually box art which we already have as main image)
    return images
      .slice(0, 5)
      .map((img: any) => img.imageurl_lg || img.imageurl)
      .filter((url: string) => url && url.includes("geekdo-images"));
  } catch (e) {
    console.log(`    Images API error for ${gameId}: ${e}`);
    return [];
  }
}

// Fetch extended game data from BGG's internal JSON API (no auth required)
async function fetchExtendedDataFromAPI(gameId: string): Promise<ExtendedGameData> {
  const result: ExtendedGameData = {
    rating: null,
    description: null,
    minAge: null,
    communityAge: null,
    bestPlayerCount: null,
    categories: [],
    mechanics: [],
    usersRated: null,
    isExpansion: false,
    minPlayers: null,
    maxPlayers: null,
    minPlaytime: null,
    maxPlaytime: null,
  };

  try {
    const response = await fetch(`https://api.geekdo.com/api/geekitems?objecttype=thing&objectid=${gameId}`);
    const data = await response.json();
    const item = data.item;

    if (!item) return result;

    // Check if it's an expansion
    result.isExpansion = item.subtype === "boardgameexpansion";

    // Get description (prefer short_description, fallback to full description)
    if (item.short_description) {
      result.description = item.short_description;
    } else if (item.description) {
      let desc = stripHtml(item.description);
      if (desc.length > 300) {
        desc = desc.substring(0, 300).replace(/\s+\S*$/, "") + "...";
      }
      result.description = desc;
    }

    // Get player counts
    if (item.minplayers) result.minPlayers = parseInt(item.minplayers, 10);
    if (item.maxplayers) result.maxPlayers = parseInt(item.maxplayers, 10);

    // Get playtime
    if (item.minplaytime) result.minPlaytime = parseInt(item.minplaytime, 10);
    if (item.maxplaytime) result.maxPlaytime = parseInt(item.maxplaytime, 10);

    // Get minimum age
    if (item.minage) result.minAge = parseInt(item.minage, 10);

    // Get categories
    const categories = item.links?.boardgamecategory || [];
    result.categories = categories.map((c: any) => c.name);

    // Get mechanics
    const mechanics = item.links?.boardgamemechanic || [];
    result.mechanics = mechanics.map((m: any) => m.name);

  } catch (e) {
    console.log(`    API fetch error for ${gameId}: ${e}`);
  }

  return result;
}

async function fetchGameDetails(games: Game[], page: any): Promise<Game[]> {
  // All games need images
  const gamesNeedingDetails = games.filter(g => !g.image);

  if (gamesNeedingDetails.length > 0) {
    console.log(`Fetching details for ${gamesNeedingDetails.length} games...`);

    for (let i = 0; i < gamesNeedingDetails.length; i++) {
      const game = gamesNeedingDetails[i];
      console.log(`  [${i + 1}/${gamesNeedingDetails.length}] ${game.name}`);

      try {
        let details;

        if (game.id) {
          // Navigate directly to the game page
          await page.goto(`https://boardgamegeek.com/boardgame/${game.id}`, {
            waitUntil: "domcontentloaded",
            timeout: 15000
          });
          details = await fetchGameImage(page, game);

          // If no image found, try boardgameexpansion URL
          if (!details.image) {
            await page.goto(`https://boardgamegeek.com/boardgameexpansion/${game.id}`, {
              waitUntil: "domcontentloaded",
              timeout: 15000
            });
            details = await fetchGameImage(page, game);
          }
        } else {
          // Search for the game by name
          const searchQuery = encodeURIComponent(game.name);
          await page.goto(`https://boardgamegeek.com/geeksearch.php?action=search&objecttype=boardgame&q=${searchQuery}`, {
            waitUntil: "domcontentloaded",
            timeout: 15000
          });

          // Click on the first result
          const firstResult = await page.$('table#collectionitems a[href*="/boardgame"]');
          if (firstResult) {
            await firstResult.click();
            await page.waitForLoadState("domcontentloaded");
            details = await fetchGameImage(page, game);

            // Also extract the game ID from the URL
            const url = page.url();
            const idMatch = url.match(/\/(?:boardgame|boardgameexpansion)\/(\d+)/);
            if (idMatch) {
              game.id = idMatch[1];
            }
          }
        }

        // Update game with fetched details
        const originalGame = games.find(g => g.name === game.name);
        if (originalGame) {
          if (details?.image) {
            // Use the scraped image directly (thumbnail size)
            originalGame.image = details.image;
            originalGame.thumbnail = details.image;
          }

          // Fetch gallery images from BGG's images API (faster than scraping)
          if (game.id) {
            const galleryImages = await fetchGalleryImagesFromAPI(game.id);
            // Filter out images that are the same as the cover
            const coverPicId = originalGame.image?.match(/pic\d+/)?.[0] || "NOMATCH";
            const filteredGallery = galleryImages.filter(img => !img.includes(coverPicId));
            originalGame.galleryImages = filteredGallery.slice(0, 4); // Keep max 4 gallery images
          } else {
            originalGame.galleryImages = [];
          }

          // Fetch extended data from BGG's internal JSON API
          if (game.id) {
            const extendedData = await fetchExtendedDataFromAPI(game.id);
            originalGame.rating = details?.bggRating ?? null; // Keep using page-scraped rating
            originalGame.description = extendedData.description;
            originalGame.minAge = extendedData.minAge;
            originalGame.communityAge = extendedData.communityAge;
            originalGame.bestPlayerCount = extendedData.bestPlayerCount;
            originalGame.categories = extendedData.categories;
            originalGame.mechanics = extendedData.mechanics;
            originalGame.usersRated = extendedData.usersRated;
            originalGame.isExpansion = extendedData.isExpansion || (game as any).isExpansion;
            originalGame.minPlayers = extendedData.minPlayers ?? details?.minPlayers ?? originalGame.minPlayers;
            originalGame.maxPlayers = extendedData.maxPlayers ?? details?.maxPlayers ?? originalGame.maxPlayers;
            originalGame.minPlaytime = extendedData.minPlaytime ?? details?.minPlaytime ?? originalGame.minPlaytime;
            originalGame.maxPlaytime = extendedData.maxPlaytime ?? details?.maxPlaytime ?? originalGame.maxPlaytime;
          }
          if (game.id) originalGame.id = game.id;
        }

        // Small delay to be nice to the server
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error: any) {
        console.log(`    Failed to fetch ${game.name}: ${error.message || error}`);
      }
    }
  }

  return games.map((game) => ({
    ...game,
    galleryImages: game.galleryImages ?? [],
    minPlayers: game.minPlayers ?? null,
    maxPlayers: game.maxPlayers ?? null,
    minPlaytime: game.minPlaytime ?? null,
    maxPlaytime: game.maxPlaytime ?? null,
    numPlays: game.numPlays ?? 0,
    description: game.description ?? null,
    minAge: game.minAge ?? null,
    communityAge: game.communityAge ?? null,
    bestPlayerCount: game.bestPlayerCount ?? null,
    categories: game.categories ?? [],
    mechanics: game.mechanics ?? [],
    usersRated: game.usersRated ?? null,
    isExpansion: game.isExpansion ?? false,
  }));
}

async function main() {
  // Parse command line arguments for limit
  const args = process.argv.slice(2);
  let limit: number | null = null;

  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      limit = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--limit" || arg === "-l") {
      const idx = args.indexOf(arg);
      if (args[idx + 1]) {
        limit = parseInt(args[idx + 1], 10);
      }
    } else if (!isNaN(parseInt(arg, 10))) {
      limit = parseInt(arg, 10);
    }
  }

  if (limit) {
    console.log(`🧪 Test mode: limiting to ${limit} games`);
  }

  try {
    console.log("Launching browser...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log(`Navigating to collection page...`);
    await page.goto(COLLECTION_URL, { waitUntil: "networkidle" });

    // Wait for the table to load
    await page.waitForSelector("table", { timeout: 30000 });

    console.log("Extracting game data...");

    // Extract game data from the table rows
    const scrapedGames = await page.evaluate(() => {
      const rows = document.querySelectorAll("table tbody tr");
      const gameList: any[] = [];

      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 5) return;

        // First cell contains game name and year
        const nameCell = cells[0];
        const link = nameCell.querySelector("a");
        if (!link) return;

        const name = link.textContent?.trim() || "";
        const href = link.getAttribute("href") || "";

        // Skip invalid entries (UI elements that got scraped)
        if (!name || name.includes("»") || name.includes("Filters") || name.length < 2) {
          return;
        }

        // Extract game ID from href - check for both boardgame and boardgameexpansion
        const idMatch = href.match(/\/(?:boardgame|boardgameexpansion)\/(\d+)/);
        const id = idMatch ? idMatch[1] : "";

        // Check if it's an expansion from the URL
        const isExpansion = href.includes("boardgameexpansion");

        // Extract year from the cell text (format: "Game Name (2020)")
        const cellText = nameCell.textContent || "";
        const yearMatch = cellText.match(/\((\d{4})\)/);
        const year = yearMatch ? parseInt(yearMatch[1]) : null;

        // Don't use personal rating from collection - we'll get BGG community rating later
        gameList.push({
          id,
          name,
          yearPublished: year,
          image: "",
          thumbnail: "",
          galleryImages: [],
          rating: null, // Will be filled with BGG community rating
          description: null,
          minAge: null,
          communityAge: null,
          bestPlayerCount: null,
          categories: [],
          mechanics: [],
          usersRated: null,
          isExpansion,
        });
      });

      return gameList;
    });

    console.log(`Found ${scrapedGames.length} games`);

    // Apply limit if specified
    const gamesToFetch = limit ? scrapedGames.slice(0, limit) : scrapedGames;
    if (limit && scrapedGames.length > limit) {
      console.log(`Limiting to first ${limit} games for testing`);
    }

    const games = await fetchGameDetails(gamesToFetch, page);

    await browser.close();

    // Sort by name
    games.sort((a, b) => a.name.localeCompare(b.name));

    const data: GamesData = {
      username: BGG_USERNAME,
      fetchedAt: new Date().toISOString(),
      totalGames: games.length,
      games,
    };

    // Ensure data directory exists
    const dataDir = join(process.cwd(), "data");
    mkdirSync(dataDir, { recursive: true });

    // Write to JSON file
    const outputPath = join(dataDir, "games.json");
    writeFileSync(outputPath, JSON.stringify(data, null, 2));

    console.log(`✓ Successfully scraped ${games.length} games`);
    console.log(`✓ Saved to ${outputPath}`);
  } catch (error) {
    console.error("Error scraping collection:", error);
    process.exit(1);
  }
}

main();
