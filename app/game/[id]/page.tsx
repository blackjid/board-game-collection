import Link from "next/link";
import { getGameById } from "@/lib/games";
import { GameDetailClient } from "./GameDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GameDetailPage({ params }: PageProps) {
  const { id } = await params;
  const game = await getGameById(id);

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
