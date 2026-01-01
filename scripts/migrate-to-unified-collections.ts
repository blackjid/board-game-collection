/**
 * Data Migration Script: Unified Collection Model
 *
 * NOTE: This migration has already been applied.
 * This script now serves as a verification/status check.
 *
 * Run with: npx tsx scripts/migrate-to-unified-collections.ts
 */

import prisma from "../lib/prisma.js";

async function main() {
  console.log("🔍 Checking unified collection model status...\n");

  // Check for primary collection
  const primaryCollection = await prisma.collection.findFirst({
    where: { isPrimary: true },
    include: {
      _count: { select: { games: true } },
    },
  });

  if (!primaryCollection) {
    console.log("⚠️  No primary collection found!");
    console.log("   Creating a default primary collection...");

    const newPrimary = await prisma.collection.create({
      data: {
        name: "My Collection",
        type: "manual",
        isPrimary: true,
      },
    });

    console.log(`✅ Created primary collection: "${newPrimary.name}" (${newPrimary.id})`);
  } else {
    console.log(`✅ Primary collection exists: "${primaryCollection.name}" (${primaryCollection.id})`);
    console.log(`   - Type: ${primaryCollection.type}`);
    console.log(`   - BGG Username: ${primaryCollection.bggUsername || "(none)"}`);
    console.log(`   - Games: ${primaryCollection._count.games}`);
  }

  console.log("");

  // Summary of all collections
  const collections = await prisma.collection.findMany({
    include: {
      _count: { select: { games: true } },
    },
    orderBy: { isPrimary: "desc" },
  });

  console.log("📊 Collection Summary:");
  console.log("─".repeat(60));
  for (const col of collections) {
    const primaryBadge = col.isPrimary ? " ⭐ PRIMARY" : "";
    const syncBadge = col.type === "bgg_sync" ? ` 🔄 @${col.bggUsername}` : "";
    console.log(`   ${col.name}${primaryBadge}${syncBadge}`);
    console.log(`      Type: ${col.type} | Games: ${col._count.games}`);
  }
  console.log("─".repeat(60));

  // Game statistics
  const totalGames = await prisma.game.count();
  const scrapedGames = await prisma.game.count({ where: { lastScraped: { not: null } } });
  const gamesInCollections = await prisma.collectionGame.findMany({
    select: { gameId: true },
    distinct: ["gameId"],
  });

  console.log("\n📈 Game Statistics:");
  console.log(`   - Total games in database: ${totalGames}`);
  console.log(`   - Games with scraped data: ${scrapedGames}`);
  console.log(`   - Games in at least one collection: ${gamesInCollections.length}`);

  console.log("\n✅ Status check complete!");
}

main()
  .catch((e) => {
    console.error("❌ Script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
