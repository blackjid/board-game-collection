import type { BggClient } from "./types";
import { GeekdoApiClient } from "./geekdo-client";
import { XmlApi2Client } from "./xmlapi2-client";

// ============================================================================
// Client Factory
// ============================================================================

let cachedClient: BggClient | null = null;

/**
 * Get the BGG client instance.
 *
 * If BGG_TOKEN is set, uses the official XML API v2 client.
 * Otherwise, falls back to the internal Geekdo JSON API client.
 *
 * The client instance is cached for reuse.
 */
export function getBggClient(): BggClient {
  if (cachedClient) {
    return cachedClient;
  }

  const token = process.env.BGG_TOKEN;

  if (token) {
    console.log("[BGG] Using XML API v2 client (authenticated)");
    cachedClient = new XmlApi2Client(token);
  } else {
    console.log("[BGG] Using Geekdo API client (unauthenticated)");
    cachedClient = new GeekdoApiClient();
  }

  return cachedClient;
}

/**
 * Reset the cached client (useful for testing or when config changes)
 */
export function resetBggClient(): void {
  cachedClient = null;
}

/**
 * Check if the XML API v2 client is available (token is configured)
 */
export function isXmlApiAvailable(): boolean {
  return !!process.env.BGG_TOKEN;
}

/**
 * Get the current client type
 */
export function getClientType(): "geekdo" | "xmlapi2" | null {
  if (!cachedClient) {
    return null;
  }
  return cachedClient.clientType;
}
