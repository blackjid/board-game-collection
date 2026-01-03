import Link from "next/link";
import { getGameById, getManualLists } from "@/lib/games";
import { getCurrentUser } from "@/lib/auth";
import { listGamePlays } from "@/lib/plays";
import { GameDetailClient } from "./GameDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GameDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch game, user, lists, and play history in parallel
  const [game, currentUser, lists, plays] = await Promise.all([
    getGameById(id),
    getCurrentUser(),
    getManualLists(),
    listGamePlays({ gameId: id, limit: 5 }),
  ]);

  if (!game) {
    return (
      <div className="min-h-screen bg-stone-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black mb-4">Game Not Found</h1>
          <p className="text-stone-400 mb-8">The game you&apos;re looking for doesn&apos;t exist.</p>
          <Link
            href="/"
            className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Back to Collection
          </Link>
        </div>
      </div>
    );
  }

  return (
    <GameDetailClient
      game={game}
      currentUser={currentUser ? {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      } : null}
      lists={lists}
      plays={plays}
    />
  );
}
