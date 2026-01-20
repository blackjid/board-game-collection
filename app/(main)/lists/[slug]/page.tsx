import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCollectionBySlug } from "@/lib/games";
import { getCurrentUser } from "@/lib/auth";
import { getServerUIPreferences } from "@/lib/cookies.server";
import { HomeClient } from "@/components/HomeClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}

// Generate metadata with canonical URL
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);

  if (!collection) {
    return {
      title: "List Not Found",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const canonicalUrl = `${baseUrl}/lists/${slug}`;

  return {
    title: `${collection.name} | Board Game Collection`,
    description: collection.description || `${collection.gameCount} games in ${collection.name}`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: collection.name,
      description: collection.description || `${collection.gameCount} games`,
      url: canonicalUrl,
      type: "website",
    },
  };
}

export default async function ListPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { token } = await searchParams;

  // Fetch collection and user in parallel
  const [collection, currentUser, uiPrefs] = await Promise.all([
    getCollectionBySlug(slug),
    getCurrentUser(),
    getServerUIPreferences(),
  ]);

  if (!collection) {
    notFound();
  }

  // Check access permissions
  // Access allowed if:
  // 1. Collection is public, OR
  // 2. Collection is the primary collection (always viewable), OR
  // 3. User is authenticated, OR
  // 4. Valid share token is provided
  const hasAccess =
    collection.isPublic ||
    collection.isPrimary ||
    currentUser !== null ||
    (token && collection.shareToken === token);

  if (!hasAccess) {
    notFound();
  }

  // Determine if this is a shared view (unauthenticated access via token)
  const isSharedView = !currentUser && !!token && collection.shareToken === token;

  return (
    <HomeClient
      games={collection.games}
      totalGames={collection.gameCount}
      collectionName={collection.name}
      bggUsername={null}
      lastSyncedAt={null}
      currentUser={
        currentUser
          ? {
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
              role: currentUser.role,
            }
          : null
      }
      selectedCollection={{
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        type: collection.type,
        isPrimary: collection.isPrimary,
        isPublic: collection.isPublic,
        shareToken: collection.shareToken,
        bggUsername: null,
        gameCount: collection.gameCount,
      }}
      initialViewMode={uiPrefs.viewMode}
      initialCardSize={uiPrefs.cardSize}
      isSharedView={isSharedView}
    />
  );
}
