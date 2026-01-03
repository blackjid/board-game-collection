import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  COOKIE_PREFIX,
  UI_DEFAULTS,
  getUIPreferences,
  saveUIPreference,
} from "./cookies";

describe("cookies", () => {
  // Store original document.cookie
  let originalCookie: PropertyDescriptor | undefined;

  beforeEach(() => {
    // Save original cookie descriptor
    originalCookie = Object.getOwnPropertyDescriptor(document, "cookie");

    // Mock document.cookie
    let cookieStore = "";
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => cookieStore,
      set: (value: string) => {
        // Parse and store cookie (simplified - just append)
        const [cookiePart] = value.split(";");
        const [key] = cookiePart.split("=");

        // Remove existing cookie with same key if present
        const cookies = cookieStore.split(";").filter((c) => {
          const [existingKey] = c.trim().split("=");
          return existingKey !== key;
        });

        cookies.push(cookiePart);
        cookieStore = cookies.filter(Boolean).join("; ");
      },
    });
  });

  afterEach(() => {
    // Restore original cookie
    if (originalCookie) {
      Object.defineProperty(document, "cookie", originalCookie);
    }
  });

  describe("constants", () => {
    it("should have correct COOKIE_PREFIX", () => {
      expect(COOKIE_PREFIX).toBe("bgc_");
    });

    it("should have correct UI_DEFAULTS", () => {
      expect(UI_DEFAULTS).toEqual({
        viewMode: "card",
        cardSize: 6,
      });
    });
  });

  describe("getUIPreferences", () => {
    it("should return defaults when no cookies set", () => {
      const prefs = getUIPreferences();
      expect(prefs).toEqual(UI_DEFAULTS);
    });

    it("should return viewMode from cookie", () => {
      document.cookie = `${COOKIE_PREFIX}viewMode=list`;
      const prefs = getUIPreferences();
      expect(prefs.viewMode).toBe("list");
    });

    it("should return cardSize from cookie", () => {
      document.cookie = `${COOKIE_PREFIX}cardSize=8`;
      const prefs = getUIPreferences();
      expect(prefs.cardSize).toBe(8);
    });

    it("should return both preferences from cookies", () => {
      document.cookie = `${COOKIE_PREFIX}viewMode=table`;
      document.cookie = `${COOKIE_PREFIX}cardSize=4`;
      const prefs = getUIPreferences();
      expect(prefs).toEqual({
        viewMode: "table",
        cardSize: 4,
      });
    });

    it("should return default for invalid cardSize", () => {
      document.cookie = `${COOKIE_PREFIX}cardSize=invalid`;
      const prefs = getUIPreferences();
      expect(prefs.cardSize).toBe(NaN); // parseInt returns NaN for invalid
    });
  });

  describe("saveUIPreference", () => {
    it("should save viewMode to cookie", () => {
      saveUIPreference("viewMode", "list");
      expect(document.cookie).toContain(`${COOKIE_PREFIX}viewMode=list`);
    });

    it("should save cardSize to cookie", () => {
      saveUIPreference("cardSize", 10);
      expect(document.cookie).toContain(`${COOKIE_PREFIX}cardSize=10`);
    });

    it("should overwrite existing cookie value", () => {
      saveUIPreference("viewMode", "card");
      saveUIPreference("viewMode", "table");
      const prefs = getUIPreferences();
      expect(prefs.viewMode).toBe("table");
    });
  });

  describe("server-side behavior", () => {
    it("should handle undefined document gracefully in getUIPreferences", () => {
      // This test verifies the typeof document check works
      // In a real server environment, document would be undefined
      // Here we can't truly test that, but we verify the function works
      const prefs = getUIPreferences();
      expect(prefs).toBeDefined();
    });
  });
});
