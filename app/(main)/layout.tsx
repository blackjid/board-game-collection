import { getCollections, getGameCount } from "@/lib/games";
import { getCurrentUser } from "@/lib/auth";
import { MainLayoutClient } from "@/components/MainLayoutClient";

export const dynamic = "force-dynamic";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch sidebar data in parallel
  const [collections, counts, currentUser] = await Promise.all([
    getCollections(),
    getGameCount(),
    getCurrentUser(),
  ]);

  return (
    <MainLayoutClient
      collections={collections}
      allGamesCount={counts.active}
      user={
        currentUser
          ? {
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
              role: currentUser.role,
            }
          : null
      }
    >
      {children}
    </MainLayoutClient>
  );
}
