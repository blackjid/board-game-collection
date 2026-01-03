/**
 * Server-side cookie utilities for UI preferences
 * Use this ONLY in Server Components
 */

import { cookies } from "next/headers";
import { COOKIE_PREFIX, UI_DEFAULTS, type UIPreferences } from "./cookies";

/**
 * Get UI preferences from cookies (server-side)
 * Call this from Server Components only
 */
export async function getServerUIPreferences(): Promise<UIPreferences> {
  const cookieStore = await cookies();
  const viewMode = cookieStore.get(`${COOKIE_PREFIX}viewMode`)?.value;
  const cardSize = cookieStore.get(`${COOKIE_PREFIX}cardSize`)?.value;

  return {
    viewMode: (viewMode as UIPreferences["viewMode"]) || UI_DEFAULTS.viewMode,
    cardSize: cardSize ? parseInt(cardSize, 10) : UI_DEFAULTS.cardSize,
  };
}


