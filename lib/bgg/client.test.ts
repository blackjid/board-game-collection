import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getBggClient, resetBggClient, isXmlApiAvailable, getClientType } from "./client";
import { GeekdoApiClient } from "./geekdo-client";
import { XmlApi2Client } from "./xmlapi2-client";

describe("lib/bgg/client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    resetBggClient();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    resetBggClient();
  });

  // ============================================================================
  // getBggClient
  // ============================================================================

  describe("getBggClient", () => {
    it("should return GeekdoApiClient when BGG_TOKEN is not set", () => {
      delete process.env.BGG_TOKEN;

      const client = getBggClient();

      expect(client).toBeInstanceOf(GeekdoApiClient);
      expect(client.clientType).toBe("geekdo");
    });

    it("should return XmlApi2Client when BGG_TOKEN is set", () => {
      process.env.BGG_TOKEN = "test-token";

      const client = getBggClient();

      expect(client).toBeInstanceOf(XmlApi2Client);
      expect(client.clientType).toBe("xmlapi2");
    });

    it("should cache and return the same client instance", () => {
      delete process.env.BGG_TOKEN;

      const client1 = getBggClient();
      const client2 = getBggClient();

      expect(client1).toBe(client2);
    });

    it("should return new instance after resetBggClient", () => {
      delete process.env.BGG_TOKEN;

      const client1 = getBggClient();
      resetBggClient();
      const client2 = getBggClient();

      expect(client1).not.toBe(client2);
    });
  });

  // ============================================================================
  // isXmlApiAvailable
  // ============================================================================

  describe("isXmlApiAvailable", () => {
    it("should return false when BGG_TOKEN is not set", () => {
      delete process.env.BGG_TOKEN;

      expect(isXmlApiAvailable()).toBe(false);
    });

    it("should return true when BGG_TOKEN is set", () => {
      process.env.BGG_TOKEN = "test-token";

      expect(isXmlApiAvailable()).toBe(true);
    });
  });

  // ============================================================================
  // getClientType
  // ============================================================================

  describe("getClientType", () => {
    it("should return null when client not initialized", () => {
      expect(getClientType()).toBeNull();
    });

    it("should return 'geekdo' when using GeekdoApiClient", () => {
      delete process.env.BGG_TOKEN;
      getBggClient();

      expect(getClientType()).toBe("geekdo");
    });

    it("should return 'xmlapi2' when using XmlApi2Client", () => {
      process.env.BGG_TOKEN = "test-token";
      getBggClient();

      expect(getClientType()).toBe("xmlapi2");
    });
  });
});
