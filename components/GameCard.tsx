"use client";

import Image from "next/image";
import Link from "next/link";
import type { GameData } from "@/lib/games";

interface GameCardProps {
  game: GameData;
}

// Calculate rating color: red (4) -> yellow (6) -> green (8+)
function getRatingColor(rating: number): string {
  // Clamp rating between 4 and 8
  const clampedRating = Math.max(4, Math.min(8, rating));
  // Normalize to 0-1 range (4 = 0, 8 = 1)
  const normalized = (clampedRating - 4) / 4;

  // Color stops: red (0) -> orange (0.25) -> yellow (0.5) -> lime (0.75) -> green (1)
  let r, g, b;

  if (normalized < 0.5) {
    // Red to Yellow (0 to 0.5)
    const t = normalized * 2;
    r = 220;
    g = Math.round(80 + t * 140); // 80 to 220
    b = Math.round(60 - t * 20);  // 60 to 40
  } else {
    // Yellow to Green (0.5 to 1)
    const t = (normalized - 0.5) * 2;
    r = Math.round(220 - t * 140); // 220 to 80
    g = Math.round(180 + t * 20);  // 180 to 200
    b = Math.round(40 + t * 40);   // 40 to 80
  }

  return `rgb(${r}, ${g}, ${b})`;
}

export function GameCard({ game }: GameCardProps) {
  // Use selectedThumbnail if available, otherwise fall back to image/thumbnail
  const imageUrl = game.selectedThumbnail || game.image || game.thumbnail || null;

  // Format player count
  const playerCount = game.minPlayers && game.maxPlayers
    ? game.minPlayers === game.maxPlayers
      ? `${game.minPlayers}P`
      : `${game.minPlayers}-${game.maxPlayers}P`
    : null;

  // Format playtime
  const playtime = game.minPlaytime && game.maxPlaytime
    ? game.minPlaytime === game.maxPlaytime
      ? `${game.minPlaytime}m`
      : `${game.minPlaytime}-${game.maxPlaytime}m`
    : null;

  // Get rating color
  const ratingColor = game.rating ? getRatingColor(game.rating) : undefined;

  return (
    <Link
      href={`/game/${game.id}`}
      className="bg-stone-900 rounded-xl overflow-hidden flex flex-col print:shadow-none print:border-stone-300 print:break-inside-avoid hover:bg-stone-800 hover:ring-1 hover:ring-amber-500/50 transition-all duration-200 cursor-pointer group"
    >
      {/* Game Cover Image with Blurred Background */}
      <div className="aspect-square relative overflow-hidden bg-stone-800">
        {imageUrl ? (
          <>
            {/* Blurred background layer - scaled up to ensure full coverage */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <Image
                src={imageUrl}
                alt=""
                aria-hidden="true"
                fill
                sizes="300px"
                className="object-cover blur-3xl saturate-150 opacity-80 scale-[3]"
              />
            </div>

            {/* Subtle vignette overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />

            {/* Main image - shown at natural aspect ratio, centered */}
            <Image
              src={imageUrl}
              alt={game.name}
              fill
              sizes="(max-width: 640px) 50vw, 16vw"
              className="object-contain z-10 drop-shadow-lg group-hover:scale-105 transition-transform duration-300"
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-stone-800 to-stone-900">
            <div className="text-center">
              <div className="text-4xl mb-2">🎲</div>
              <span className="text-stone-500 text-xs font-medium line-clamp-2">
                {game.name}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Game Info - Unified layout for both screen and print */}
      <div className="p-3 print:p-1 flex flex-col flex-grow">
        <h3 className="font-semibold text-white text-sm print:text-[8px] leading-tight print:leading-snug line-clamp-2 print:line-clamp-none group-hover:text-amber-400 transition-colors">
          {game.name}
        </h3>

        {game.yearPublished && (
          <p className="text-xs print:text-[7px] text-stone-500 mt-0.5">
            {game.yearPublished}
          </p>
        )}

        <div className="flex items-center justify-start gap-1.5 print:gap-1 text-xs print:text-[7px] text-stone-400 mt-auto pt-1.5 print:pt-0.5">
          {game.rating && (
            <span
              className="text-white font-bold px-1.5 py-0.5 rounded text-[10px] print:text-[6px] print:px-1 print:py-0"
              style={{ backgroundColor: ratingColor }}
            >
              {game.rating.toFixed(1)}
            </span>
          )}
          {playerCount && (
            <span>{playerCount}</span>
          )}
          {playtime && (
            <>
              <span className="text-stone-600">•</span>
              <span>{playtime}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
