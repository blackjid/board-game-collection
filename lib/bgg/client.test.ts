import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getBggClient, resetBggClient, isBggConfigured } from "./client";
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
    it("should throw error when BGG_TOKEN is not set", () => {
      delete process.env.BGG_TOKEN;

      expect(() => getBggClient()).toThrow("BGG_TOKEN environment variable is required");
    });

    it("should return XmlApi2Client when BGG_TOKEN is set", () => {
      process.env.BGG_TOKEN = "test-token";

      const client = getBggClient();

      expect(client).toBeInstanceOf(XmlApi2Client);
      expect(client.clientType).toBe("xmlapi2");
    });

    it("should cache and return the same client instance", () => {
      process.env.BGG_TOKEN = "test-token";

      const client1 = getBggClient();
      const client2 = getBggClient();

      expect(client1).toBe(client2);
    });

    it("should return new instance after resetBggClient", () => {
      process.env.BGG_TOKEN = "test-token";

      const client1 = getBggClient();
      resetBggClient();
      const client2 = getBggClient();

      expect(client1).not.toBe(client2);
    });
  });

  // ============================================================================
  // isBggConfigured
  // ============================================================================

  describe("isBggConfigured", () => {
    it("should return false when BGG_TOKEN is not set", () => {
      delete process.env.BGG_TOKEN;

      expect(isBggConfigured()).toBe(false);
    });

    it("should return true when BGG_TOKEN is set", () => {
      process.env.BGG_TOKEN = "test-token";

      expect(isBggConfigured()).toBe(true);
    });
  });
});
