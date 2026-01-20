import prisma from "./prisma";

/**
 * Generate a URL-friendly slug from a string
 * - Converts to lowercase
 * - Replaces spaces and special characters with hyphens
 * - Removes consecutive hyphens
 * - Trims hyphens from start/end
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Replace accented characters with their base equivalents
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Replace spaces and special characters with hyphens
    .replace(/[^a-z0-9]+/g, "-")
    // Remove consecutive hyphens
    .replace(/-+/g, "-")
    // Trim hyphens from start/end
    .replace(/^-|-$/g, "");
}

/**
 * Generate a unique slug for a collection
 * If the base slug already exists, appends a numeric suffix (-2, -3, etc.)
 * 
 * @param name - The collection name to generate a slug from
 * @param excludeId - Optional collection ID to exclude from uniqueness check (for updates)
 */
export async function generateUniqueSlug(
  name: string,
  excludeId?: string
): Promise<string> {
  const baseSlug = generateSlug(name);
  
  if (!baseSlug) {
    // Fallback for names that result in empty slugs
    return `list-${Date.now()}`;
  }

  // Check if base slug is available
  const existing = await prisma.collection.findFirst({
    where: {
      slug: baseSlug,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  if (!existing) {
    return baseSlug;
  }

  // Find next available suffix
  let suffix = 2;
  while (true) {
    const candidateSlug = `${baseSlug}-${suffix}`;
    const exists = await prisma.collection.findFirst({
      where: {
        slug: candidateSlug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (!exists) {
      return candidateSlug;
    }
    suffix++;
    
    // Safety limit to prevent infinite loops
    if (suffix > 1000) {
      return `${baseSlug}-${Date.now()}`;
    }
  }
}
