import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { HomeClient } from "@/components/HomeClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

function parseJsonArray(json: string | null): string[] {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export default async function SharedCollectionPage({ params }: PageProps) {
  const { token } = await params;

  // Find collection by share token
  const collection = await prisma.collection.findUnique({
    where: { shareToken: token },
    include: {
      games: {
        include: {
          game: true,
        },
        orderBy: { addedAt: "desc" },
      },
    },
  });

  if (!collection) {
    notFound();
  }

  // Transform games to match GameData interface
  const games = collection.games.map((cg) => ({
    id: cg.game.id,
    name: cg.game.name,
    yearPublished: cg.game.yearPublished,
    image: cg.game.selectedThumbnail || cg.game.image || cg.game.thumbnail,
    thumbnail: cg.game.thumbnail,
    selectedThumbnail: cg.game.selectedThumbnail,
    description: cg.game.description,
    minPlayers: cg.game.minPlayers,
    maxPlayers: cg.game.maxPlayers,
    minPlaytime: cg.game.minPlaytime,
    maxPlaytime: cg.game.maxPlaytime,
    rating: cg.game.rating,
    minAge: cg.game.minAge,
    isExpansion: cg.game.isExpansion,
    lastScraped: cg.game.lastScraped?.toISOString() ?? null,
    categories: parseJsonArray(cg.game.categories),
    mechanics: parseJsonArray(cg.game.mechanics),
    componentImages: parseJsonArray(cg.game.componentImages),
    availableImages: parseJsonArray(cg.game.availableImages),
  }));

  return (
    <div className="min-h-screen bg-background">
      <HomeClient
        games={games}
        totalGames={games.length}
        collectionName={collection.name}
        bggUsername={null}
        lastSyncedAt={null}
        currentUser={null}
        selectedCollection={{
          id: collection.id,
          name: collection.name,
          description: collection.description,
          type: collection.type,
          isPrimary: collection.isPrimary,
          isPublic: collection.isPublic,
          shareToken: collection.shareToken,
          bggUsername: null,
          gameCount: games.length,
        }}
        initialViewMode="card"
        initialCardSize={6}
        isSharedView={true}
      />
    </div>
  );
}
