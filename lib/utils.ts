import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize a string for accent-insensitive search.
 * Removes diacritics (accents) and converts to lowercase.
 * e.g., "María" -> "maria", "José" -> "jose"
 */
export function normalizeForSearch(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
