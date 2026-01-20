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

  // Filter collections based on authentication status
  // Unauthenticated users can only see public collections and the primary collection
  const visibleCollections = currentUser
    ? collections
    : collections.filter((c) => c.isPublic || c.isPrimary);

  return (
    <MainLayoutClient
      collections={visibleCollections}
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
