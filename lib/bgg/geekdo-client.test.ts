import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GeekdoApiClient } from "./geekdo-client";

// Mock Playwright using vi.hoisted
const mocks = vi.hoisted(() => {
  const page = {
    goto: vi.fn(),
    waitForSelector: vi.fn(),
    evaluate: vi.fn(),
    close: vi.fn(),
  };
  return {
    page,
    launch: vi.fn(),
  };
});

vi.mock("playwright", () => {
  const browser = {
    newContext: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue(mocks.page),
    }),
    close: vi.fn(),
  };

  mocks.launch.mockResolvedValue(browser);

  return {
    chromium: {
      launch: mocks.launch,
    },
  };
});

describe("lib/bgg/geekdo-client", () => {
  let client: GeekdoApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GeekdoApiClient();
    global.fetch = vi.fn();

    // Reset Playwright mock
    const browser = {
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue(mocks.page),
      }),
      close: vi.fn(),
    };
    mocks.launch.mockResolvedValue(browser);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // Constructor
  // ============================================================================

  describe("constructor", () => {
    it("should set clientType to geekdo", () => {
      expect(client.clientType).toBe("geekdo");
    });
  });

  // ============================================================================
  // getGameDetails
  // ============================================================================

  describe("getGameDetails", () => {
    it("should fetch game details from geekdo API", async () => {
      const geekItemResponse = {
        item: {
          objectid: "174430",
          name: "Gloomhaven",
          yearpublished: "2017",
          subtype: "boardgame",
          short_description: "A game of Euro-inspired tactical combat",
          minplayers: "1",
          maxplayers: "4",
          minplaytime: "60",
          maxplaytime: "120",
          minage: "14",
          images: {
            thumb: "https://example.com/thumb.jpg",
            square200: "https://example.com/square.jpg",
          },
          links: {
            boardgamecategory: [{ name: "Adventure" }],
            boardgamemechanic: [{ name: "Cooperative Game" }],
            expandsboardgame: [],
            boardgameexpansion: [{ objectid: "12345", name: "Expansion 1" }],
          },
        },
      };

      const dynamicInfoResponse = {
        item: {
          stats: {
            average: "8.71",
          },
        },
      };

      const imagesResponse = {
        images: [
          { imageurl_lg: "https://example.com/gallery1.jpg" },
          { imageurl: "https://example.com/gallery2.jpg" },
        ],
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(geekItemResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(dynamicInfoResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(imagesResponse),
        } as Response);

      // Mock Playwright page.evaluate for scraping
      mocks.page.evaluate.mockResolvedValue("https://example.com/main.jpg");

      const result = await client.getGameDetails("174430");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("174430");
      expect(result?.name).toBe("Gloomhaven");
      expect(result?.yearPublished).toBe(2017);
      expect(result?.description).toBe("A game of Euro-inspired tactical combat");
      expect(result?.minPlayers).toBe(1);
      expect(result?.maxPlayers).toBe(4);
      expect(result?.minPlaytime).toBe(60);
      expect(result?.maxPlaytime).toBe(120);
      expect(result?.minAge).toBe(14);
      expect(result?.rating).toBe(8.7);
      expect(result?.categories).toContain("Adventure");
      expect(result?.mechanics).toContain("Cooperative Game");
      expect(result?.isExpansion).toBe(false);
      expect(result?.expansionIds).toContain("12345");
    });

    it("should return null when game not found", async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ item: null }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ item: null }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ images: [] }),
        } as Response);

      mocks.page.evaluate.mockResolvedValue(null);

      const result = await client.getGameDetails("invalid-id");

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // getCollection
  // ============================================================================

  describe("getCollection", () => {
    it("should scrape collection from BGG page", async () => {
      const mockGames = [
        { id: "174430", name: "Gloomhaven", yearPublished: 2017, isExpansion: false },
        { id: "12345", name: "Some Expansion", yearPublished: 2020, isExpansion: true },
      ];

      mocks.page.evaluate.mockResolvedValue(mockGames);

      const result = await client.getCollection("testuser");

      expect(mocks.page.goto).toHaveBeenCalledWith(
        expect.stringContaining("collection/user/testuser"),
        expect.any(Object)
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("174430");
      expect(result[0].name).toBe("Gloomhaven");
      expect(result[0].isExpansion).toBe(false);
      expect(result[1].isExpansion).toBe(true);
    });
  });

  // ============================================================================
  // getGalleryImages
  // ============================================================================

  describe("getGalleryImages", () => {
    it("should fetch edition covers from XML API v2 with versions=1", async () => {
      const xmlResponse = `<?xml version="1.0" encoding="utf-8"?>
        <items>
          <item type="boardgame" id="174430">
            <image>https://cf.geekdo-images.com/main.jpg</image>
            <versions>
              <item type="boardgameversion" id="1">
                <image>https://cf.geekdo-images.com/version1.jpg</image>
              </item>
              <item type="boardgameversion" id="2">
                <image>https://cf.geekdo-images.com/version2.jpg</image>
              </item>
            </versions>
          </item>
        </items>`;

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(xmlResponse),
      } as Response);

      const result = await client.getGalleryImages("174430");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("xmlapi2/thing?id=174430&versions=1")
      );

      expect(result).toHaveLength(3);
      expect(result).toContain("https://cf.geekdo-images.com/main.jpg");
      expect(result).toContain("https://cf.geekdo-images.com/version1.jpg");
      expect(result).toContain("https://cf.geekdo-images.com/version2.jpg");
    });

    it("should return empty array on error", async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

      const result = await client.getGalleryImages("174430");

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // search
  // ============================================================================

  describe("search", () => {
    it("should search games using suggest API", async () => {
      const suggestResponse = {
        items: [
          { objectid: "174430", name: "Gloomhaven", yearpublished: "2017" },
        ],
      };

      const detailResponse = {
        item: {
          name: "Gloomhaven",
          yearpublished: "2017",
          subtype: "boardgame",
          images: { square200: "https://example.com/thumb.jpg" },
        },
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(suggestResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(detailResponse),
        } as Response);

      const result = await client.search("Gloomhaven", 15);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("search/boardgame?q=Gloomhaven"),
        expect.any(Object)
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("174430");
      expect(result[0].name).toBe("Gloomhaven");
      expect(result[0].thumbnail).toBe("https://example.com/thumb.jpg");
    });

    it("should fallback to hotness when search returns empty", async () => {
      const hotnessResponse = {
        items: [
          { objectid: "174430", name: "Gloomhaven", yearpublished: "2017" },
          { objectid: "12345", name: "Other Game", yearpublished: "2020" },
        ],
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ items: [] }), // Empty search
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(hotnessResponse),
        } as Response);

      const result = await client.search("Gloom", 15);

      // Should filter hotness results by query
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Gloomhaven");
    });
  });

  // ============================================================================
  // getHotGames
  // ============================================================================

  describe("getHotGames", () => {
    it("should fetch hot games from API", async () => {
      const hotnessResponse = {
        items: [
          { objectid: "174430", name: "Gloomhaven", yearpublished: "2017", thumbnail: "https://example.com/thumb.jpg" },
          { objectid: "12345", name: "Another Game" },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(hotnessResponse),
      } as Response);

      const result = await client.getHotGames();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("api/hotness")
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("174430");
      expect(result[0].name).toBe("Gloomhaven");
      expect(result[0].yearPublished).toBe(2017);
      expect(result[0].thumbnail).toBe("https://example.com/thumb.jpg");
    });

    it("should return empty array on error", async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

      const result = await client.getHotGames();

      expect(result).toEqual([]);
    });
  });
});
