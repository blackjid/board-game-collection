"use client";

import Image from "next/image";

interface GameResult {
  id: string;
  name: string;
  image: string | null;
  rating: number | null;
  likes: number;
  picks: number;
  skips: number;
  likedBy: string[];
  pickedBy: string[];
  isUnanimous: boolean;
}

interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
  status: string;
}

interface SessionResultsProps {
  sessionCode: string;
  players: PlayerInfo[];
  unanimousMatches: GameResult[];
  rankedResults: GameResult[];
  onClose: () => void;
}

const Icons = {
  trophy: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 15c-3.87 0-7-3.13-7-7h2c0 2.76 2.24 5 5 5s5-2.24 5-5h2c0 3.87-3.13 7-7 7z"/>
      <path d="M19 3h-2V2h-2v1H9V2H7v1H5c-1.1 0-2 .9-2 2v3c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H8v2h8v-2h-3v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V5c0-1.1-.9-2-2-2zM5 8V5h2v3c0 1.1.9 2 2 2h.14c-.45-.59-.87-1.24-1.18-1.94C6.26 7.68 5 6.46 5 5v3zm14 0c0 1.46-1.26 2.68-2.96 3.06-.31.7-.73 1.35-1.18 1.94H15c1.1 0 2-.9 2-2V5h2v3z"/>
    </svg>
  ),
  heart: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  star: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  users: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  home: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  sparkles: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/>
    </svg>
  ),
};

function GameResultCard({ game, rank, totalPlayers }: { game: GameResult; rank?: number; totalPlayers: number }) {
  const positiveVotes = game.likes + game.picks;
  const votePercentage = Math.round((positiveVotes / totalPlayers) * 100);

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
      game.isUnanimous
        ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30"
        : "bg-stone-800/50"
    }`}>
      {/* Rank or Trophy */}
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
        {game.isUnanimous ? (
          <span className="w-8 h-8 text-amber-400">{Icons.trophy}</span>
        ) : rank ? (
          <span className="text-xl font-black text-stone-500">#{rank}</span>
        ) : null}
      </div>

      {/* Game Image */}
      <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-stone-700">
        {game.image ? (
          <Image
            src={game.image}
            alt={game.name}
            width={64}
            height={64}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-500">
            <span className="w-8 h-8">{Icons.star}</span>
          </div>
        )}
      </div>

      {/* Game Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-white truncate">{game.name}</h3>
        <div className="flex items-center gap-3 mt-1">
          {game.rating && (
            <span className="text-amber-400 text-sm flex items-center gap-1">
              <span className="w-3 h-3">{Icons.star}</span>
              {game.rating.toFixed(1)}
            </span>
          )}
          <span className="text-stone-400 text-sm flex items-center gap-1">
            <span className="w-3 h-3">{Icons.heart}</span>
            {positiveVotes}/{totalPlayers}
          </span>
        </div>
        {/* Liked by */}
        <p className="text-stone-500 text-xs mt-1 truncate">
          {[...game.pickedBy.map(n => `⭐ ${n}`), ...game.likedBy].join(", ")}
        </p>
      </div>

      {/* Vote Percentage */}
      <div className="flex-shrink-0 text-right">
        <span className={`text-lg font-bold ${
          votePercentage === 100 ? "text-amber-400" :
          votePercentage >= 75 ? "text-emerald-400" :
          votePercentage >= 50 ? "text-blue-400" : "text-stone-400"
        }`}>
          {votePercentage}%
        </span>
      </div>
    </div>
  );
}

export default function SessionResults({
  sessionCode,
  players,
  unanimousMatches,
  rankedResults,
  onClose,
}: SessionResultsProps) {
  const hasUnanimous = unanimousMatches.length > 0;
  const topPick = hasUnanimous ? unanimousMatches[0] : rankedResults[0];

  // Limit results shown to avoid overwhelming mobile users
  const maxOtherResults = 5;

  return (
    <div className="min-h-full pt-16 pb-8 px-4 animate-scale-in overflow-y-auto" data-allow-scroll>
      <div className="max-w-lg w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-6 flex-shrink-0">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <span className="w-4 h-4">{Icons.users}</span>
            {players.length} players · Session {sessionCode}
          </div>

          {hasUnanimous ? (
            <>
              <h1 className="text-3xl font-black text-white mb-2 flex items-center justify-center gap-3">
                <span className="w-8 h-8 text-amber-400">{Icons.sparkles}</span>
                Perfect Match!
                <span className="w-8 h-8 text-amber-400">{Icons.sparkles}</span>
              </h1>
              <p className="text-stone-400">Everyone agreed on {unanimousMatches.length === 1 ? "this game" : "these games"}!</p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-black text-white mb-2">Results Are In!</h1>
              <p className="text-stone-400">No perfect match, but here are the top picks</p>
            </>
          )}
        </div>

        {/* Winner Card */}
        {topPick && (
          <div className="bg-gradient-to-b from-amber-500/10 to-transparent rounded-2xl p-6 mb-6 flex-shrink-0 border border-amber-500/20">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-stone-700 flex-shrink-0">
                {topPick.image ? (
                  <Image
                    src={topPick.image}
                    alt={topPick.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-500">
                    <span className="w-10 h-10">{Icons.star}</span>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 text-amber-400">{Icons.trophy}</span>
                  <span className="text-amber-400 font-bold text-sm">
                    {hasUnanimous ? "Everyone's Choice" : "Top Pick"}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-white">{topPick.name}</h2>
                <div className="flex items-center gap-3 mt-2">
                  {topPick.rating && (
                    <span className="text-amber-400 flex items-center gap-1">
                      <span className="w-4 h-4">{Icons.star}</span>
                      {topPick.rating.toFixed(1)}
                    </span>
                  )}
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-4 h-4">{Icons.heart}</span>
                    {topPick.likes + topPick.picks} likes
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results List - no scrolling, limited items */}
        <div className="mb-6">
          {hasUnanimous && unanimousMatches.length > 1 && (
            <div className="mb-6">
              <h3 className="text-stone-400 text-sm font-medium uppercase tracking-wider mb-3">
                All Perfect Matches
              </h3>
              <div className="space-y-2">
                {unanimousMatches.slice(1, maxOtherResults + 1).map((game) => (
                  <GameResultCard
                    key={game.id}
                    game={game}
                    totalPlayers={players.length}
                  />
                ))}
              </div>
            </div>
          )}

          {rankedResults.length > 0 && (
            <div>
              <h3 className="text-stone-400 text-sm font-medium uppercase tracking-wider mb-3">
                {hasUnanimous ? "Other Popular Games" : "Ranked by Votes"}
              </h3>
              <div className="space-y-2">
                {rankedResults.slice(hasUnanimous ? 0 : 1, maxOtherResults).map((game, index) => (
                  <GameResultCard
                    key={game.id}
                    game={game}
                    rank={hasUnanimous ? index + 1 : index + 2}
                    totalPlayers={players.length}
                  />
                ))}
              </div>
            </div>
          )}

          {!topPick && (
            <div className="text-center py-12">
              <p className="text-stone-500">No votes recorded yet.</p>
            </div>
          )}
        </div>

        {/* Exit Button */}
        <div className="pt-6">
          <button
            onClick={onClose}
            className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-4 rounded-full font-bold transition-colors flex items-center justify-center gap-2"
          >
            <span className="w-5 h-5">{Icons.home}</span>
            Back to Collection
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in {
          animation: scale-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
