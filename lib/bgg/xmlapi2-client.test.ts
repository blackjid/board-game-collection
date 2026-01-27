import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { XmlApi2Client } from "./xmlapi2-client";

describe("lib/bgg/xmlapi2-client", () => {
  let client: XmlApi2Client;
  const mockToken = "test-bearer-token";

  beforeEach(() => {
    vi.clearAllMocks();
    // Use a short rate limit for tests
    client = new XmlApi2Client(mockToken, 0);
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // Constructor and Authentication
  // ============================================================================

  describe("constructor", () => {
    it("should set clientType to xmlapi2", () => {
      expect(client.clientType).toBe("xmlapi2");
    });
  });

  // ============================================================================
  // getGameDetails
  // ============================================================================

  describe("getGameDetails", () => {
    it("should fetch and parse game details from XML API", async () => {
      const xmlResponse = `<?xml version="1.0" encoding="utf-8"?>
        <items>
          <item type="boardgame" id="174430">
            <name type="primary" value="Gloomhaven" />
            <yearpublished value="2017" />
            <description>A game of Euro-inspired tactical combat</description>
            <image>https://cf.geekdo-images.com/image.jpg</image>
            <thumbnail>https://cf.geekdo-images.com/thumb.jpg</thumbnail>
            <minplayers value="1" />
            <maxplayers value="4" />
            <minplaytime value="60" />
            <maxplaytime value="120" />
            <minage value="14" />
            <link type="boardgamecategory" id="1022" value="Adventure" />
            <link type="boardgamemechanic" id="2023" value="Cooperative Game" />
            <statistics>
              <ratings>
                <average value="8.71" />
              </ratings>
            </statistics>
          </item>
        </items>`;

      vi.mocked(global.fetch).mockResolvedValue({
        status: 200,
        ok: true,
        text: () => Promise.resolve(xmlResponse),
      } as Response);

      const result = await client.getGameDetails("174430");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://boardgamegeek.com/xmlapi2/thing?id=174430&stats=1",
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${mockToken}`,
            Accept: "application/xml",
          },
        })
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe("174430");
      expect(result?.name).toBe("Gloomhaven");
      expect(result?.yearPublished).toBe(2017);
      expect(result?.minPlayers).toBe(1);
      expect(result?.maxPlayers).toBe(4);
      expect(result?.minPlaytime).toBe(60);
      expect(result?.maxPlaytime).toBe(120);
      expect(result?.minAge).toBe(14);
      expect(result?.rating).toBe(8.7);
      expect(result?.categories).toContain("Adventure");
      expect(result?.mechanics).toContain("Cooperative Game");
      expect(result?.isExpansion).toBe(false);
    });

    it("should return null when API returns error", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        status: 404,
        ok: false,
        text: () => Promise.resolve("Not Found"),
      } as Response);

      const result = await client.getGameDetails("invalid-id");

      expect(result).toBeNull();
    });

    it("should retry on 202 (queued) response", async () => {
      const xmlResponse = `<?xml version="1.0" encoding="utf-8"?>
        <items>
          <item type="boardgame" id="1">
            <name type="primary" value="Test Game" />
          </item>
        </items>`;

      // First call returns 202, second returns 200
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          status: 202,
          ok: false,
          text: () => Promise.resolve("Queued"),
        } as Response)
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          text: () => Promise.resolve(xmlResponse),
        } as Response);

      const result = await client.getGameDetails("1");

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).not.toBeNull();
      expect(result?.name).toBe("Test Game");
    });

    it("should identify expansions correctly", async () => {
      const xmlResponse = `<?xml version="1.0" encoding="utf-8"?>
        <items>
          <item type="boardgameexpansion" id="12345">
            <name type="primary" value="Test Expansion" />
            <link type="boardgameexpansion" id="100" value="Base Game" inbound="true" />
          </item>
        </items>`;

      vi.mocked(global.fetch).mockResolvedValue({
        status: 200,
        ok: true,
        text: () => Promise.resolve(xmlResponse),
      } as Response);

      const result = await client.getGameDetails("12345");

      expect(result?.isExpansion).toBe(true);
      expect(result?.baseGameIds).toContain("100");
    });
  });

  // ============================================================================
  // getGamesDetails
  // ============================================================================

  describe("getGamesDetails", () => {
    it("should batch requests for more than 20 games", async () => {
      const createXmlResponse = (ids: string[]) => `<?xml version="1.0" encoding="utf-8"?>
        <items>
          ${ids.map((id) => `<item type="boardgame" id="${id}"><name type="primary" value="Game ${id}" /></item>`).join("")}
        </items>`;

      // Generate 25 game IDs
      const gameIds = Array.from({ length: 25 }, (_, i) => String(i + 1));

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          text: () => Promise.resolve(createXmlResponse(gameIds.slice(0, 20))),
        } as Response)
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          text: () => Promise.resolve(createXmlResponse(gameIds.slice(20))),
        } as Response);

      const results = await client.getGamesDetails(gameIds);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(25);
    });
  });

  // ============================================================================
  // getCollection
  // ============================================================================

  describe("getCollection", () => {
    it("should fetch and parse collection from XML API", async () => {
      const xmlResponse = `<?xml version="1.0" encoding="utf-8"?>
        <items>
          <item objectid="174430" subtype="boardgame">
            <name>Gloomhaven</name>
            <yearpublished>2017</yearpublished>
          </item>
          <item objectid="12345" subtype="boardgameexpansion">
            <name>Some Expansion</name>
            <yearpublished>2020</yearpublished>
          </item>
        </items>`;

      vi.mocked(global.fetch).mockResolvedValue({
        status: 200,
        ok: true,
        text: () => Promise.resolve(xmlResponse),
      } as Response);

      const result = await client.getCollection("testuser");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("collection?username=testuser&own=1"),
        expect.any(Object)
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("174430");
      expect(result[0].name).toBe("Gloomhaven");
      expect(result[0].yearPublished).toBe(2017);
      expect(result[0].isExpansion).toBe(false);
      expect(result[1].isExpansion).toBe(true);
    });

    it("should return empty array when collection is empty", async () => {
      const xmlResponse = `<?xml version="1.0" encoding="utf-8"?><items></items>`;

      vi.mocked(global.fetch).mockResolvedValue({
        status: 200,
        ok: true,
        text: () => Promise.resolve(xmlResponse),
      } as Response);

      const result = await client.getCollection("emptyuser");

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // getGalleryImages (version images)
  // ============================================================================

  describe("getGalleryImages", () => {
    it("should fetch version images using versions=1 parameter", async () => {
      const xmlResponse = `<?xml version="1.0" encoding="utf-8"?>
        <items>
          <item type="boardgame" id="174430">
            <image>https://cf.geekdo-images.com/main.jpg</image>
            <versions>
              <item type="boardgameversion" id="460243">
                <image>https://cf.geekdo-images.com/version1.jpg</image>
              </item>
              <item type="boardgameversion" id="482203">
                <image>https://cf.geekdo-images.com/version2.jpg</image>
              </item>
            </versions>
          </item>
        </items>`;

      vi.mocked(global.fetch).mockResolvedValue({
        status: 200,
        ok: true,
        text: () => Promise.resolve(xmlResponse),
      } as Response);

      const result = await client.getGalleryImages("174430");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://boardgamegeek.com/xmlapi2/thing?id=174430&versions=1",
        expect.any(Object)
      );

      expect(result).toHaveLength(3);
      expect(result).toContain("https://cf.geekdo-images.com/main.jpg");
      expect(result).toContain("https://cf.geekdo-images.com/version1.jpg");
      expect(result).toContain("https://cf.geekdo-images.com/version2.jpg");
    });

    it("should deduplicate version images", async () => {
      const xmlResponse = `<?xml version="1.0" encoding="utf-8"?>
        <items>
          <item type="boardgame" id="174430">
            <image>https://cf.geekdo-images.com/main.jpg</image>
            <versions>
              <item type="boardgameversion" id="1">
                <image>https://cf.geekdo-images.com/main.jpg</image>
              </item>
              <item type="boardgameversion" id="2">
                <image>https://cf.geekdo-images.com/main.jpg</image>
              </item>
            </versions>
          </item>
        </items>`;

      vi.mocked(global.fetch).mockResolvedValue({
        status: 200,
        ok: true,
        text: () => Promise.resolve(xmlResponse),
      } as Response);

      const result = await client.getGalleryImages("174430");

      // Should only have 1 unique image
      expect(result).toHaveLength(1);
      expect(result[0]).toBe("https://cf.geekdo-images.com/main.jpg");
    });

    it("should return empty array when no versions", async () => {
      const xmlResponse = `<?xml version="1.0" encoding="utf-8"?>
        <items>
          <item type="boardgame" id="174430">
          </item>
        </items>`;

      vi.mocked(global.fetch).mockResolvedValue({
        status: 200,
        ok: true,
        text: () => Promise.resolve(xmlResponse),
      } as Response);

      const result = await client.getGalleryImages("174430");

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // search
  // ============================================================================

  describe("search", () => {
    it("should search for games by name", async () => {
      const searchXml = `<?xml version="1.0" encoding="utf-8"?>
        <items>
          <item type="boardgame" id="174430">
            <name type="primary" value="Gloomhaven" />
            <yearpublished value="2017" />
          </item>
        </items>`;

      const thingXml = `<?xml version="1.0" encoding="utf-8"?>
        <items>
          <item type="boardgame" id="174430">
            <name type="primary" value="Gloomhaven" />
            <thumbnail>https://example.com/thumb.jpg</thumbnail>
          </item>
        </items>`;

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          text: () => Promise.resolve(searchXml),
        } as Response)
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          text: () => Promise.resolve(thingXml),
        } as Response);

      const result = await client.search("Gloomhaven", 15);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("search?query=Gloomhaven"),
        expect.any(Object)
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("174430");
      expect(result[0].name).toBe("Gloomhaven");
    });
  });

  // ============================================================================
  // getHotGames
  // ============================================================================

  describe("getHotGames", () => {
    it("should fetch hot games from XML API", async () => {
      const xmlResponse = `<?xml version="1.0" encoding="utf-8"?>
        <items>
          <item id="174430" rank="1">
            <name value="Gloomhaven" />
            <yearpublished value="2017" />
            <thumbnail value="https://example.com/thumb.jpg" />
          </item>
          <item id="12345" rank="2">
            <name value="Another Game" />
          </item>
        </items>`;

      vi.mocked(global.fetch).mockResolvedValue({
        status: 200,
        ok: true,
        text: () => Promise.resolve(xmlResponse),
      } as Response);

      const result = await client.getHotGames();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://boardgamegeek.com/xmlapi2/hot?type=boardgame",
        expect.any(Object)
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("174430");
      expect(result[0].name).toBe("Gloomhaven");
      expect(result[0].yearPublished).toBe(2017);
      expect(result[0].thumbnail).toBe("https://example.com/thumb.jpg");
    });
  });
});
