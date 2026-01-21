/**
 * Backfill slugs for existing collections that don't have one
 *
 * This script is run automatically during docker-entrypoint after migrations.
 * It's idempotent - only updates collections that don't have slugs yet.
 *
 * Can also be run manually with: npm run data-migration:backfill-slugs
 */

import prisma from "../../../lib/prisma";

/**
 * Generate a URL-friendly slug from a string
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Generate a unique slug for a collection
 */
async function generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
  const baseSlug = generateSlug(name);
  
  if (!baseSlug) {
    return `list-${Date.now()}`;
  }

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

  let suffix = 2;
  while (suffix <= 1000) {
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
  }
  
  return `${baseSlug}-${Date.now()}`;
}

export async function backfillCollectionSlugs(): Promise<void> {
  const collectionsWithoutSlugs = await prisma.collection.findMany({
    where: { slug: null },
    select: { id: true, name: true, type: true, isPrimary: true },
  });

  if (collectionsWithoutSlugs.length === 0) {
    console.log("[backfill-slugs] All collections already have slugs.");
    return;
  }

  console.log(`[backfill-slugs] Found ${collectionsWithoutSlugs.length} collection(s) without slugs:`);

  for (const collection of collectionsWithoutSlugs) {
    const slug = await generateUniqueSlug(collection.name, collection.id);
    
    console.log(`[backfill-slugs]   "${collection.name}" → "${slug}"`);

    await prisma.collection.update({
      where: { id: collection.id },
      data: { slug },
    });
  }

  console.log("[backfill-slugs] Done.");
}

// Run directly if executed as a script
const isMainModule = typeof require !== "undefined"
  ? require.main === module
  : process.argv[1]?.includes("data-migration");

if (isMainModule) {
  backfillCollectionSlugs()
    .then(() => {
      process.exit(0);
    })
    .catch((e) => {
      console.error("[backfill-slugs] Error:", e);
      process.exit(1);
    });
}
