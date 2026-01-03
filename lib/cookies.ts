/**
 * Cookie utilities for persisting UI preferences
 */

const COOKIE_PREFIX = "bgc_"; // Board Game Collection prefix
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export interface UIPreferences {
  viewMode: "card" | "list" | "table";
  cardSize: number;
}

const DEFAULTS: UIPreferences = {
  viewMode: "card",
  cardSize: 6,
};

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split("=");
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Set a cookie with optional max age
 */
function setCookie(name: string, value: string, maxAge = DEFAULT_MAX_AGE): void {
  if (typeof document === "undefined") return;

  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${maxAge};SameSite=Lax`;
}

/**
 * Get UI preferences from cookies
 */
export function getUIPreferences(): UIPreferences {
  const viewMode = getCookie(`${COOKIE_PREFIX}viewMode`);
  const cardSize = getCookie(`${COOKIE_PREFIX}cardSize`);

  return {
    viewMode: (viewMode as UIPreferences["viewMode"]) || DEFAULTS.viewMode,
    cardSize: cardSize ? parseInt(cardSize, 10) : DEFAULTS.cardSize,
  };
}

/**
 * Save a single UI preference to cookie
 */
export function saveUIPreference<K extends keyof UIPreferences>(
  key: K,
  value: UIPreferences[K]
): void {
  setCookie(`${COOKIE_PREFIX}${key}`, String(value));
}

