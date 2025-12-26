"use client";

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

  return (
    <div className="flex items-center gap-4 bg-white rounded-lg shadow-sm border border-stone-200 p-3 hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-stone-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={game.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            🎲
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-grow min-w-0">
        <h3 className="font-semibold text-stone-800 text-sm truncate">
          {game.name}
        </h3>
        {game.yearPublished && (
          <p className="text-xs text-stone-400">{game.yearPublished}</p>
        )}
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-3 text-xs text-stone-500 flex-shrink-0">
        {playerCount && <span>{playerCount}</span>}
        {playtime && <span>{playtime}</span>}
        {game.rating && (
          <span
            className="text-white font-bold px-1.5 py-0.5 rounded text-[10px]"
            style={{ backgroundColor: ratingColor }}
          >
            {game.rating.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}

