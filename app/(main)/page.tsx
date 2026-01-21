import {
  getActiveGames,
  getGameCount,
  getCollectionSettings,
  getLastSyncInfo,
} from "@/lib/games";
import { getCurrentUser } from "@/lib/auth";
import { getServerUIPreferences } from "@/lib/cookies.server";
import { HomeClient } from "@/components/HomeClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Fetch data in parallel
  const [games, counts, settings, lastSync, currentUser, uiPrefs] = await Promise.all([
    getActiveGames(),
    getGameCount(),
    getCollectionSettings(),
    getLastSyncInfo(),
    getCurrentUser(),
    getServerUIPreferences(),
  ]);

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
      selectedCollection={null}
      initialViewMode={uiPrefs.viewMode}
      initialCardSize={uiPrefs.cardSize}
    />
  );
}
