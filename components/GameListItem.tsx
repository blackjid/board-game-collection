"use client";

import Image from "next/image";
import Link from "next/link";
import { Dice6, Users, Clock, AlertTriangle } from "lucide-react";
import type { GameData } from "@/lib/games";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GameListItemProps {
  game: GameData;
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
  const imageUrl = game.selectedThumbnail || game.image || game.thumbnail || null;

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

  // Age display
  const ageDisplay = game.minAge;

  return (
    <Link href={`/game/${game.id}`} className="block">
      <Card className={cn(
        "flex items-start gap-4 p-4 py-4 border-0",
        "hover:bg-accent hover:ring-1 hover:ring-primary/50 transition-all cursor-pointer group"
      )}>
        {/* Thumbnail */}
        <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted relative">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={game.name}
              fill
              sizes="80px"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/80">
              <Dice6 className="size-8 text-muted-foreground" />
            </div>
          )}
          {/* Expansion badge - positioned top-right to avoid checkbox */}
          {game.isExpansion && (
            <Badge className="absolute top-1 right-1 bg-purple-600 hover:bg-purple-600 text-white text-[8px] font-bold px-1 py-0.5 border-0">
              EXP
            </Badge>
          )}
          {/* Warning for expansions without any base game in collection */}
          {game.isExpansion && game.expandsGames.length > 0 && !game.expandsGames.some(g => g.inCollection) && (
            <div 
              className="absolute bottom-1 left-1"
              title={`Works with: ${game.expandsGames.map(g => g.name).join(", ")}`}
            >
              <AlertTriangle className="size-3 text-amber-500" />
            </div>
          )}
        </div>

        {/* Main Info */}
        <div className="flex-grow min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-base truncate group-hover:text-primary transition-colors">
                {game.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {game.yearPublished && (
                  <span className="text-xs text-muted-foreground">{game.yearPublished}</span>
                )}
                {ageDisplay && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                    {ageDisplay}+
                  </Badge>
                )}
              </div>
            </div>

            {/* Rating */}
            {game.rating && (
              <Badge
                className="text-white font-bold px-2 py-1 text-sm flex-shrink-0 border-0"
                style={{ backgroundColor: ratingColor }}
              >
                ★ {game.rating.toFixed(1)}
              </Badge>
            )}
          </div>

          {/* Description */}
          {game.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
              {game.description}
            </p>
          )}

          {/* Bottom row: metadata + categories */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {/* Game stats */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {playerCount && (
                <Badge variant="secondary" className="px-2 py-0.5 gap-1">
                  <Users className="size-3" />
                  {playerCount}
                </Badge>
              )}
              {playtime && (
                <Badge variant="secondary" className="px-2 py-0.5 gap-1">
                  <Clock className="size-3" />
                  {playtime}
                </Badge>
              )}
            </div>

            {/* Categories */}
            {game.categories && game.categories.length > 0 && (
              <div className="flex items-center gap-1">
                {game.categories.slice(0, 3).map((cat, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-[10px] bg-primary/10 text-primary border-primary/30 px-1.5 py-0.5"
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
