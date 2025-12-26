import Link from "next/link";
import gamesData from "@/data/games.json";
import { Game } from "@/types/game";
import { GameDetailClient } from "./GameDetailClient";

// Generate static params for all games
export function generateStaticParams() {
  return gamesData.games.map((game) => ({
    id: game.id,
  }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GameDetailPage({ params }: PageProps) {
  const { id } = await params;
  const game = gamesData.games.find((g) => g.id === id) as Game | undefined;

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

  return <GameDetailClient game={game} />;
}
