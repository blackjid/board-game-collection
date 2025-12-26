import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Strip HTML tags from text
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Fetch gallery images from BGG's internal API
async function fetchGalleryImagesFromAPI(gameId: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://api.geekdo.com/api/images?ajax=1&foritempage=1&galleries[]=game&nosession=1&objectid=${gameId}&objecttype=thing&showcount=20&size=original&sort=hot`
    );
    const data = await response.json();
    const images = data.images || [];

    return images
      .map((img: { imageurl_lg?: string; imageurl?: string }) => img.imageurl_lg || img.imageurl)
      .filter((url: string) => url && url.includes("geekdo-images"));
  } catch (e) {
    console.log(`Images API error for ${gameId}: ${e}`);
    return [];
  }
}

// Fetch extended game data from BGG's internal JSON API
async function fetchExtendedDataFromAPI(gameId: string) {
  const result = {
    rating: null as number | null,
    description: null as string | null,
    minAge: null as number | null,
    categories: [] as string[],
    mechanics: [] as string[],
    isExpansion: false,
    minPlayers: null as number | null,
    maxPlayers: null as number | null,
    minPlaytime: null as number | null,
    maxPlaytime: null as number | null,
  };

  try {
    const response = await fetch(`https://api.geekdo.com/api/geekitems?objecttype=thing&objectid=${gameId}`);
    const data = await response.json();
    const item = data.item;

    if (!item) return result;

    result.isExpansion = item.subtype === "boardgameexpansion";

    if (item.short_description) {
      result.description = item.short_description;
    } else if (item.description) {
      let desc = stripHtml(item.description);
      if (desc.length > 500) {
        desc = desc.substring(0, 500).replace(/\s+\S*$/, "") + "...";
      }
      result.description = desc;
    }

    if (item.minplayers) result.minPlayers = parseInt(item.minplayers, 10);
    if (item.maxplayers) result.maxPlayers = parseInt(item.maxplayers, 10);
    if (item.minplaytime) result.minPlaytime = parseInt(item.minplaytime, 10);
    if (item.maxplaytime) result.maxPlaytime = parseInt(item.maxplaytime, 10);
    if (item.minage) result.minAge = parseInt(item.minage, 10);

    const categories = item.links?.boardgamecategory || [];
    result.categories = categories.map((c: { name: string }) => c.name);

    const mechanics = item.links?.boardgamemechanic || [];
    result.mechanics = mechanics.map((m: { name: string }) => m.name);
  } catch (e) {
    console.log(`API fetch error for ${gameId}: ${e}`);
  }

  return result;
}

// Scrape main image and rating from game page
async function scrapeGamePage(gameId: string, isExpansion: boolean) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let image = "";
  let rating: number | null = null;

  try {
    const url = isExpansion
      ? `https://boardgamegeek.com/boardgameexpansion/${gameId}`
      : `https://boardgamegeek.com/boardgame/${gameId}`;

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    const result = await page.evaluate(() => {
      // Get the main game image
      const imgEl = document.querySelector('img[src*="cf.geekdo-images"][src*="itemrep"]') ||
                   document.querySelector('img[src*="cf.geekdo-images"]:not([src*="avatar"])');
      const image = imgEl?.getAttribute("src") || "";

      // Get BGG rating from JSON-LD
      let bggRating: number | null = null;
      const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
      if (jsonLdScript) {
        try {
          const jsonData = JSON.parse(jsonLdScript.textContent || "");
          if (jsonData.aggregateRating?.ratingValue) {
            bggRating = Math.round(parseFloat(jsonData.aggregateRating.ratingValue) * 10) / 10;
          }
        } catch {
          // Ignore JSON parse errors
        }
      }

      return { image, bggRating };
    });

    image = result.image;
    rating = result.bggRating;
  } catch (e) {
    console.log(`Scrape error for ${gameId}: ${e}`);
  } finally {
    await browser.close();
  }

  return { image, rating };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  console.log(`Scraping game: ${game.name} (${id})`);

  try {
    // Fetch all data in parallel
    const [pageData, extendedData, galleryImages] = await Promise.all([
      scrapeGamePage(id, game.isExpansion),
      fetchExtendedDataFromAPI(id),
      fetchGalleryImagesFromAPI(id),
    ]);

    // Update the game with scraped data
    const updatedGame = await prisma.game.update({
      where: { id },
      data: {
        image: pageData.image || null,
        thumbnail: pageData.image || null,
        rating: pageData.rating ?? extendedData.rating,
        description: extendedData.description,
        minPlayers: extendedData.minPlayers,
        maxPlayers: extendedData.maxPlayers,
        minPlaytime: extendedData.minPlaytime,
        maxPlaytime: extendedData.maxPlaytime,
        minAge: extendedData.minAge,
        categories: JSON.stringify(extendedData.categories),
        mechanics: JSON.stringify(extendedData.mechanics),
        isExpansion: extendedData.isExpansion,
        availableImages: JSON.stringify(galleryImages),
        lastScraped: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      game: {
        ...updatedGame,
        categories: extendedData.categories,
        mechanics: extendedData.mechanics,
        availableImages: galleryImages,
      },
    });
  } catch (error) {
    console.error(`Scrape failed for ${id}:`, error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
