import type { BggClient } from "./types";
import { XmlApi2Client } from "./xmlapi2-client";

// ============================================================================
// Client Factory
// ============================================================================

let cachedClient: BggClient | null = null;

/**
 * Get the BGG client instance.
 *
 * Uses the official XML API v2 client with BGG_TOKEN authentication.
 * Throws an error if BGG_TOKEN is not configured.
 *
 * The client instance is cached for reuse.
 */
export function getBggClient(): BggClient {
  if (cachedClient) {
    return cachedClient;
  }

  const token = process.env.BGG_TOKEN;

  if (!token) {
    throw new Error(
      "BGG_TOKEN environment variable is required. " +
        "Register an application at BoardGameGeek to get a token."
    );
  }

  console.log("[BGG] Using XML API v2 client");
  cachedClient = new XmlApi2Client(token);

  return cachedClient;
}

/**
 * Reset the cached client (useful for testing or when config changes)
 */
export function resetBggClient(): void {
  cachedClient = null;
}

/**
 * Check if BGG_TOKEN is configured
 */
export function isBggConfigured(): boolean {
  return !!process.env.BGG_TOKEN;
}
