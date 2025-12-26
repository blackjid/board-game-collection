"use client";

import Link from "next/link";
import { Game } from "@/types/game";

interface GameListItemProps {
  game: Game;
}

// Calculate rating color: red (4) -> yellow (6) -> green (8+)
function getRatingColor(rating: number): string {
  const clampedRating = Math.max(4, Math.min(8, rating));
  const normalized = (clampedRating - 4) / 4;

  let r, g, b;

  if (normalized < 0.5) {
    const t = normalized * 2;
    r = 220;
    g = Math.round(80 + t * 140);
    b = Math.round(60 - t * 20);
  } else {
    const t = (normalized - 0.5) * 2;
    r = Math.round(220 - t * 140);
    g = Math.round(180 + t * 20);
    b = Math.round(40 + t * 40);
  }

  return `rgb(${r}, ${g}, ${b})`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function GameListItem({ game }: GameListItemProps) {
  const imageUrl = game.image || game.thumbnail || null;

  const playerCount = game.minPlayers && game.maxPlayers
    ? game.minPlayers === game.maxPlayers
      ? `${game.minPlayers}P`
      : `${game.minPlayers}-${game.maxPlayers}P`
    : null;

  const playtime = game.minPlaytime && game.maxPlaytime
    ? game.minPlaytime === game.maxPlaytime
      ? `${game.minPlaytime}m`
      : `${game.minPlaytime}-${game.maxPlaytime}m`
    : null;

  const ratingColor = game.rating ? getRatingColor(game.rating) : undefined;

  // Format best player count display
  const bestPlayers = game.bestPlayerCount && game.bestPlayerCount.length > 0
    ? game.bestPlayerCount.length === 1
      ? `Best: ${game.bestPlayerCount[0]}P`
      : `Best: ${game.bestPlayerCount[0]}-${game.bestPlayerCount[game.bestPlayerCount.length - 1]}P`
    : null;

  // Age display - prefer community age, fallback to publisher age
  const ageDisplay = game.communityAge ?? game.minAge;

  return (
    <Link
      href={`/game/${game.id}`}
      className="flex items-start gap-4 bg-white rounded-lg shadow-sm border border-stone-200 p-4 hover:shadow-md hover:border-amber-300 transition-all cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-stone-100 relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={game.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">
            🎲
          </div>
        )}
        {/* Expansion badge */}
        {game.isExpansion && (
          <div className="absolute top-1 left-1 bg-purple-600 text-white text-[8px] font-bold px-1 py-0.5 rounded">
            EXP
          </div>
        )}
      </div>

      {/* Main Info */}
      <div className="flex-grow min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-stone-800 text-base truncate">
              {game.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {game.yearPublished && (
                <span className="text-xs text-stone-400">{game.yearPublished}</span>
              )}
              {ageDisplay && (
                <span className="text-xs text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                  {ageDisplay}+
                </span>
              )}
              {game.usersRated && (
                <span className="text-xs text-stone-400" title={`${game.usersRated.toLocaleString()} ratings`}>
                  {formatNumber(game.usersRated)} ratings
                </span>
              )}
            </div>
          </div>

          {/* Rating */}
          {game.rating && (
            <span
              className="text-white font-bold px-2 py-1 rounded text-sm flex-shrink-0"
              style={{ backgroundColor: ratingColor }}
            >
              ★ {game.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Description */}
        {game.description && (
          <p className="text-xs text-stone-500 mt-2 line-clamp-1">
            {game.description}
          </p>
        )}

        {/* Bottom row: metadata + categories */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {/* Game stats */}
          <div className="flex items-center gap-2 text-xs text-stone-600">
            {playerCount && (
              <span className="bg-stone-100 px-2 py-0.5 rounded">
                👥 {playerCount}
              </span>
            )}
            {bestPlayers && (
              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                {bestPlayers}
              </span>
            )}
            {playtime && (
              <span className="bg-stone-100 px-2 py-0.5 rounded">
                ⏱ {playtime}
              </span>
            )}
          </div>

          {/* Categories */}
          {game.categories && game.categories.length > 0 && (
            <div className="flex items-center gap-1">
              {game.categories.slice(0, 3).map((cat, i) => (
                <span
                  key={i}
                  className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
