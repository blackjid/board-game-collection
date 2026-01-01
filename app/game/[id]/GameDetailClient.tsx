"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Dice6, Users, Clock, Baby } from "lucide-react";
import type { GameData } from "@/lib/games";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

interface GameDetailClientProps {
  game: GameData;
}

export function GameDetailClient({ game }: GameDetailClientProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Use selectedThumbnail if available, otherwise fall back to image/thumbnail
  const mainImage = game.selectedThumbnail || game.image || game.thumbnail || null;
  const galleryImages = game.availableImages || [];
  const componentImages = game.componentImages || [];

  // All images for the gallery picker (main + available)
  const allImages = mainImage
    ? [mainImage, ...galleryImages.filter(img => img !== mainImage)]
    : galleryImages;
  const displayImage = selectedImage || mainImage;

  const playerCount =
    game.minPlayers && game.maxPlayers
      ? game.minPlayers === game.maxPlayers
        ? `${game.minPlayers} players`
        : `${game.minPlayers}-${game.maxPlayers} players`
      : null;

  const playtime =
    game.minPlaytime && game.maxPlaytime
      ? game.minPlaytime === game.maxPlaytime
        ? `${game.minPlaytime} min`
        : `${game.minPlaytime}-${game.maxPlaytime} min`
      : null;

  const ageDisplay = game.minAge;

  return (
    <div className="min-h-screen bg-gradient-to-b from-card via-background to-background text-foreground">
      {/* Hero Section with Background */}
      <div className="relative">
        {/* Blurred background */}
        {displayImage && (
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={displayImage}
              alt=""
              fill
              sizes="100vw"
              className="object-cover blur-3xl opacity-30 scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-card/50 via-background/80 to-background" />
          </div>
        )}

        {/* Navigation */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between">
          <Button variant="ghost" asChild className="gap-2">
            <Link href="/">
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Back to Collection</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>

          {/* Let's Play Button */}
          <Button
            onClick={() => {
              alert(`Tonight you're playing ${game.name}! 🎲`);
            }}
            className="rounded-full font-bold gap-2 shadow-lg shadow-primary/20"
          >
            Let&apos;s Play!
            <Dice6 className="size-5" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-8 sm:pb-16">
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12">
            {/* Left: Image Gallery */}
            <div className="lg:w-2/5 flex-shrink-0">
              {/* Main Image */}
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-border bg-muted aspect-square sm:aspect-[3/4]">
                {displayImage ? (
                  <Image
                    src={displayImage}
                    alt={game.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-8xl">
                    🎲
                  </div>
                )}

                {/* Expansion badge */}
                {game.isExpansion && (
                  <Badge className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-purple-600 hover:bg-purple-600 text-white text-xs sm:text-sm font-bold">
                    Expansion
                  </Badge>
                )}

                {/* Rating badge */}
                {game.rating && (
                  <div
                    className="absolute top-2 sm:top-4 right-2 sm:right-4 px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl font-black text-base sm:text-xl shadow-lg"
                    style={{ backgroundColor: getRatingColor(game.rating) }}
                  >
                    ★ {game.rating.toFixed(1)}
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {allImages.length > 1 && (
                <div className="flex gap-2 sm:gap-3 mt-3 sm:mt-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                  {allImages.map((img: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(img)}
                      className={cn(
                        "w-14 h-14 sm:w-20 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all relative",
                        (selectedImage || mainImage) === img
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border hover:border-muted-foreground"
                      )}
                    >
                      <Image src={img} alt="" fill sizes="80px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Game Info */}
            <div className="lg:w-3/5">
              {/* Header */}
              <div className="mb-4 sm:mb-6">
                <div className="flex items-center gap-3 mb-2 sm:mb-3">
                  {game.yearPublished && (
                    <span className="text-primary text-xs sm:text-sm font-semibold tracking-wider">
                      {game.yearPublished}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-2 sm:mb-4">
                  {game.name}
                </h1>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8">
                {playerCount && (
                  <div className="px-3 sm:px-5 py-2 sm:py-3 bg-muted rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium backdrop-blur-sm border border-border">
                    <span className="text-muted-foreground block text-[10px] sm:text-xs mb-0.5 sm:mb-1">Players</span>
                    <span className="text-foreground flex items-center gap-1.5">
                      <Users className="size-4" />
                      {playerCount}
                    </span>
                  </div>
                )}
                {playtime && (
                  <div className="px-3 sm:px-5 py-2 sm:py-3 bg-muted rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium backdrop-blur-sm border border-border">
                    <span className="text-muted-foreground block text-[10px] sm:text-xs mb-0.5 sm:mb-1">Playtime</span>
                    <span className="text-foreground flex items-center gap-1.5">
                      <Clock className="size-4" />
                      {playtime}
                    </span>
                  </div>
                )}
                {ageDisplay && (
                  <div className="px-3 sm:px-5 py-2 sm:py-3 bg-muted rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium backdrop-blur-sm border border-border">
                    <span className="text-muted-foreground block text-[10px] sm:text-xs mb-0.5 sm:mb-1">Age</span>
                    <span className="text-foreground flex items-center gap-1.5">
                      <Baby className="size-4" />
                      {ageDisplay}+
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {game.description && (
                <div className="mb-6 sm:mb-8">
                  <h2 className="text-base sm:text-lg font-semibold text-muted-foreground mb-2 sm:mb-3">About</h2>
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                    {game.description}
                  </p>
                </div>
              )}

              {/* Component Images */}
              {componentImages.length > 0 && (
                <div className="mb-6 sm:mb-8">
                  <h2 className="text-base sm:text-lg font-semibold text-muted-foreground mb-2 sm:mb-3">Game Components</h2>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {componentImages.map((img: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(img)}
                        className="aspect-square rounded-lg overflow-hidden border border-border hover:border-muted-foreground transition-all relative"
                      >
                        <Image src={img} alt="" fill sizes="33vw" className="object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories */}
              {game.categories && game.categories.length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-base sm:text-lg font-semibold text-muted-foreground mb-2 sm:mb-3">Categories</h2>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {game.categories.map((cat: string, i: number) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs sm:text-sm"
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Mechanics */}
              {game.mechanics && game.mechanics.length > 0 && (
                <div className="mb-6 sm:mb-8">
                  <h2 className="text-base sm:text-lg font-semibold text-muted-foreground mb-2 sm:mb-3">Mechanics</h2>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {game.mechanics.map((mech: string, i: number) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs sm:text-sm"
                      >
                        {mech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* External Link */}
              <div className="pt-4 sm:pt-6 border-t border-border flex items-center gap-4">
                <a
                  href={`https://boardgamegeek.com/boardgame/${game.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 sm:gap-3 px-3 py-2 rounded-lg bg-muted border border-border hover:border-primary/50 transition-all"
                >
                  <Image
                    src="/powered-by-bgg.svg"
                    alt="Powered by BoardGameGeek"
                    width={120}
                    height={24}
                    className="h-5 sm:h-6 w-auto opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                  <ExternalLink className="size-3 sm:size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
