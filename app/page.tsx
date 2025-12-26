import { getActiveGames, getGameCount, getCollectionSettings } from "@/lib/games";
import { HomeClient } from "@/components/HomeClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [games, counts, settings] = await Promise.all([
    getActiveGames(),
    getGameCount(),
    getCollectionSettings(),
  ]);

  return (
    <HomeClient
      games={games}
      totalGames={counts.active}
      collectionName={settings.collectionName}
      bggUsername={settings.bggUsername}
    />
  );
}
