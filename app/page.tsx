import { getActiveGames, getGameCount } from "@/lib/games";
import { HomeClient } from "@/components/HomeClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [games, counts] = await Promise.all([
    getActiveGames(),
    getGameCount(),
  ]);

  return (
    <HomeClient
      games={games}
      totalGames={counts.active}
      username="jidonoso"
    />
  );
}
