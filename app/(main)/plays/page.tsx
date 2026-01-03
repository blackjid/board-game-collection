import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listGamePlays } from "@/lib/plays";
import { getActiveGames } from "@/lib/games";
import { PlaysClient } from "./PlaysClient";

export const dynamic = "force-dynamic";

export default async function PlaysPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const [plays, games] = await Promise.all([
    listGamePlays({ limit: 100 }),
    getActiveGames(),
  ]);

  // Simplify games for the selector
  const gameOptions = games.map((g) => ({
    id: g.id,
    name: g.name,
    thumbnail: g.thumbnail,
  }));

  return (
    <PlaysClient
      plays={plays}
      games={gameOptions}
      currentUser={{
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      }}
    />
  );
}
