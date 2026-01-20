import {
  getActiveGames,
  getGameCount,
  getCollectionSettings,
  getLastSyncInfo,
  getCollectionWithGames,
} from "@/lib/games";
import { getCurrentUser } from "@/lib/auth";
import { getServerUIPreferences } from "@/lib/cookies.server";
import { HomeClient } from "@/components/HomeClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ collection?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedCollectionId = params.collection || null;

  // Fetch base data in parallel
  const [counts, settings, lastSync, currentUser, uiPrefs] = await Promise.all([
    getGameCount(),
    getCollectionSettings(),
    getLastSyncInfo(),
    getCurrentUser(),
    getServerUIPreferences(),
  ]);

  // Fetch games based on whether a collection is selected
  let games;
  let selectedCollection = null;

  if (selectedCollectionId) {
    const collectionData = await getCollectionWithGames(selectedCollectionId);
    if (collectionData) {
      games = collectionData.games;
      selectedCollection = {
        id: collectionData.id,
        name: collectionData.name,
        description: collectionData.description,
        type: collectionData.type,
        isPrimary: collectionData.isPrimary,
        isPublic: collectionData.isPublic,
        shareToken: collectionData.shareToken,
        bggUsername: collectionData.bggUsername,
        gameCount: collectionData.gameCount,
      };
    } else {
      // Collection not found, fall back to all games
      games = await getActiveGames();
    }
  } else {
    games = await getActiveGames();
  }

  return (
    <HomeClient
      games={games}
      totalGames={counts.active}
      collectionName={settings.collectionName}
      bggUsername={settings.bggUsername}
      lastSyncedAt={lastSync.syncedAt?.toISOString() || null}
      currentUser={currentUser ? {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      } : null}
      selectedCollection={selectedCollection}
      initialViewMode={uiPrefs.viewMode}
      initialCardSize={uiPrefs.cardSize}
    />
  );
}
