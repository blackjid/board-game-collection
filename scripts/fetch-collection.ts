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

async function fetchRatingFromAPI(gameId: string): Promise<number | null> {
  try {
    const response = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`);
    const text = await response.text();
    // Parse XML to find average rating
    const avgMatch = text.match(/<average[^>]*value="([^"]+)"/);
    if (avgMatch) {
      const rating = parseFloat(avgMatch[1]);
      if (!isNaN(rating) && rating >= 1 && rating <= 10) {
        return Math.round(rating * 10) / 10;
      }
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
}

async function fetchGalleryImages(page: any, gameId: string, gameSlug: string): Promise<string[]> {
  try {
    // Navigate to the game's images page filtered by Components
    const imagesUrl = `https://boardgamegeek.com/boardgame/${gameId}/${gameSlug}/images?pageid=1&tag=Components`;
    await page.goto(imagesUrl, {
      waitUntil: "domcontentloaded",
      timeout: 10000
    });

    // Wait a bit for images to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Extract image IDs from the gallery links (e.g., /image/12345)
    const imageIds = await page.evaluate(() => {
      const ids: string[] = [];
      const links = document.querySelectorAll('a[href*="/image/"]');
      links.forEach((link) => {
        const href = link.getAttribute("href") || "";
        const match = href.match(/\/image\/(\d+)/);
        if (match && !ids.includes(match[1]) && ids.length < 4) {
          ids.push(match[1]);
        }
      });
      return ids;
    });

    // For each image ID, navigate to the image page and get the original URL
    const originalUrls: string[] = [];
    for (const imageId of imageIds.slice(0, 4)) { // Limit to 4 to avoid being too slow
      try {
        await page.goto(`https://boardgamegeek.com/image/${imageId}`, {
          waitUntil: "domcontentloaded",
          timeout: 8000
        });
        await new Promise(resolve => setTimeout(resolve, 500));

        const originalUrl = await page.evaluate(() => {
          // Look for the full-size image on the image page
          // Try multiple approaches to find the original URL

          // Method 1: Look for __original in any img src
          const originalImg = document.querySelector('img[src*="__original"]');
          if (originalImg) {
            return originalImg.getAttribute("src") || "";
          }

          // Method 2: Look for a link to the original image
          const originalLink = document.querySelector('a[href*="__original"]');
          if (originalLink) {
            return originalLink.getAttribute("href") || "";
          }

          // Method 3: Look for a large image (imagepage size is still good)
          const largeImg = document.querySelector('img[src*="__imagepage"][src*="cf.geekdo-images"]');
          if (largeImg) {
            return largeImg.getAttribute("src") || "";
          }

          // Method 4: Look for any large geekdo image
          const anyImg = document.querySelector('img[src*="cf.geekdo-images"][src*="/pic"]');
          if (anyImg) {
            return anyImg.getAttribute("src") || "";
          }

          return "";
        });

        if (originalUrl && !originalUrls.includes(originalUrl)) {
          originalUrls.push(originalUrl);
        }
      } catch (e) {
        // Skip this image if we can't fetch it
      }
    }

    return originalUrls;
  } catch (e) {
    console.log(`    Gallery fetch error: ${e}`);
    return [];
  }
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

          // Fetch gallery images from the Components images page (these are original URLs)
          if (game.id) {
            const gameSlug = game.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            const galleryImages = await fetchGalleryImages(page, game.id, gameSlug);
            // Filter out images that are the same as the cover
            const coverPicId = originalGame.image?.match(/pic\d+/)?.[0] || "NOMATCH";
            const filteredGallery = galleryImages.filter(img => !img.includes(coverPicId));
            originalGame.galleryImages = filteredGallery;
          } else {
            originalGame.galleryImages = [];
          }

          // Get BGG community rating - try API if DOM scraping failed
          let rating = details?.bggRating ?? null;
          if (!rating && game.id) {
            rating = await fetchRatingFromAPI(game.id);
          }
          originalGame.rating = rating;

          originalGame.minPlayers = details?.minPlayers ?? originalGame.minPlayers;
          originalGame.maxPlayers = details?.maxPlayers ?? originalGame.maxPlayers;
          originalGame.minPlaytime = details?.minPlaytime ?? originalGame.minPlaytime;
          originalGame.maxPlaytime = details?.maxPlaytime ?? originalGame.maxPlaytime;
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
