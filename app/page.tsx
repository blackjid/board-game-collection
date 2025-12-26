import { getActiveGames, getGameCount, getCollectionSettings, getLastSyncInfo } from "@/lib/games";
import { getCurrentUser } from "@/lib/auth";
import { HomeClient } from "@/components/HomeClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [games, counts, settings, lastSync, currentUser] = await Promise.all([
    getActiveGames(),
    getGameCount(),
    getCollectionSettings(),
    getLastSyncInfo(),
    getCurrentUser(),
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
    />
  );
}
