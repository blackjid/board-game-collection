"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncedState } from "@/lib/hooks";
import {
  ExternalLink,
  Dice6,
  Users,
  Clock,
  Baby,
  FolderPlus,
  Check,
  Plus,
  Loader2,
  Trophy,
  Pencil,
  Trash2,
  AlertTriangle,
  Puzzle,
  ChevronRight,
  Package,
  Brain,
  Award,
  Star,
} from "lucide-react";
import type { GameData, ManualListSummary } from "@/lib/games";
import type { GamePlayData } from "@/types/play";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/SiteHeader";
import { CreateListDialog } from "@/components/ListDialogs";
import { LogPlayDialog } from "@/components/LogPlayDialog";
import { EditPlayDialog } from "@/components/EditPlayDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    b = Math.round(40 + t * 80);
  }

  return `rgb(${r}, ${g}, ${b})`;
}

interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface GameDetailClientProps {
  game: GameData;
  currentUser: CurrentUser | null;
  lists: ManualListSummary[];
  plays: GamePlayData[];
}

export function GameDetailClient({ game, currentUser, lists, plays: initialPlays }: GameDetailClientProps) {
  const router = useRouter();
  const [plays, setPlays] = useSyncedState(initialPlays);
  const [showCreateListDialog, setShowCreateListDialog] = useState(false);
  const [showLogPlayDialog, setShowLogPlayDialog] = useState(false);
  const [editingPlay, setEditingPlay] = useState<GamePlayData | null>(null);
  const [deletingPlay, setDeletingPlay] = useState<GamePlayData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingListId, setTogglingListId] = useState<string | null>(null);
  const [localListMembership, setLocalListMembership] = useState<Map<string, boolean>>(() => {
    // Initialize with current membership from lists prop
    const map = new Map<string, boolean>();
    lists.forEach((list) => {
      map.set(list.id, list.gameIds.includes(game.id));
    });
    return map;
  });

  const isAdmin = currentUser?.role === "admin";
  const isLoggedIn = !!currentUser;

  // Use selectedThumbnail if available, otherwise fall back to image/thumbnail
  const mainImage = game.selectedThumbnail || game.image || game.thumbnail || null;

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

  // Check if game is in a list
  const isInList = useCallback(
    (listId: string) => localListMembership.get(listId) ?? false,
    [localListMembership]
  );

  // Toggle game in/out of a list
  const toggleListMembership = async (listId: string) => {
    const currentlyInList = isInList(listId);
    setTogglingListId(listId);

    try {
      if (currentlyInList) {
        // Remove from list
        const response = await fetch(`/api/collections/${listId}/games`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: game.id }),
        });
        if (response.ok) {
          setLocalListMembership((prev) => new Map(prev).set(listId, false));
        }
      } else {
        // Add to list
        const response = await fetch(`/api/collections/${listId}/games`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: game.id,
            name: game.name,
            yearPublished: game.yearPublished,
            isExpansion: game.isExpansion,
          }),
        });
        if (response.ok) {
          setLocalListMembership((prev) => new Map(prev).set(listId, true));
        }
      }
    } catch (error) {
      console.error("Failed to toggle list membership:", error);
    } finally {
      setTogglingListId(null);
    }
  };

  // Handle deleting a play
  const handleDeletePlay = async () => {
    if (!deletingPlay) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/plays/${deletingPlay.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPlays(plays.filter((p) => p.id !== deletingPlay.id));
        setDeletingPlay(null);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete play");
      }
    } catch (error) {
      console.error("Failed to delete play:", error);
      alert("Failed to delete play");
    } finally {
      setDeleting(false);
    }
  };

  // Check if user can modify a play
  const canModifyPlay = (play: GamePlayData) =>
    currentUser && (currentUser.id === play.loggedById || currentUser.role === "admin");

  // Handle creating a new list and adding the game to it
  const handleListCreated = async (newList: { id: string; name: string }) => {
    // Add the game to the newly created list
    try {
      await fetch(`/api/collections/${newList.id}/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          name: game.name,
          yearPublished: game.yearPublished,
          isExpansion: game.isExpansion,
        }),
      });
      // Update local state
      setLocalListMembership((prev) => new Map(prev).set(newList.id, true));
      router.refresh();
    } catch (error) {
      console.error("Failed to add game to new list:", error);
    }
  };

  // Header actions for SiteHeader
  const headerActions = (
    <div className="flex items-center gap-2">
      {/* Add to List Button - Admin only */}
      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <FolderPlus className="size-4" />
              <span className="hidden sm:inline">Add to List</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {lists.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                No lists yet
              </div>
            ) : (
              lists.map((list) => {
                const inList = isInList(list.id);
                const isToggling = togglingListId === list.id;

                return (
                  <DropdownMenuItem
                    key={list.id}
                    onClick={() => toggleListMembership(list.id)}
                    disabled={isToggling}
                    className="flex items-center gap-2"
                  >
                    <div
                      className={cn(
                        "size-4 rounded border flex items-center justify-center",
                        inList
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground"
                      )}
                    >
                      {isToggling ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : inList ? (
                        <Check className="size-3" />
                      ) : null}
                    </div>
                    <span className="flex-1 truncate">{list.name}</span>
                  </DropdownMenuItem>
                );
              })
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowCreateListDialog(true)}>
              <Plus className="size-4" />
              Create New List
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Log Play / Let's Play Button - Only show for base games, not expansions */}
      {isLoggedIn && !game.isExpansion ? (
        <Button
          onClick={() => setShowLogPlayDialog(true)}
          className="rounded-full font-bold gap-2 shadow-lg shadow-primary/20"
          size="sm"
        >
          <span className="hidden sm:inline">Log Play</span>
          <Dice6 className="size-5" />
        </Button>
      ) : isLoggedIn && game.isExpansion ? null : (
        <Button
          onClick={() => {
            alert(`Tonight you're playing ${game.name}! 🎲`);
          }}
          className="rounded-full font-bold gap-2 shadow-lg shadow-primary/20"
          size="sm"
        >
          <span className="hidden sm:inline">Let&apos;s Play!</span>
          <Dice6 className="size-5" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-card via-background to-background text-foreground">
      {/* Site Header with breadcrumbs */}
      <SiteHeader
        breadcrumbs={[{ label: game.name }]}
        actions={headerActions}
      />

      {/* Hero Section with Background */}
      <div className="relative">
        {/* Blurred background */}
        {mainImage && (
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={mainImage}
              alt=""
              fill
              sizes="100vw"
              className="object-cover blur-3xl opacity-30 scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-card/50 via-background/80 to-background" />
          </div>
        )}


        {/* Main Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-8 sm:pb-16">
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12">
            {/* Left: Image Gallery */}
            <div className="lg:w-2/5 flex-shrink-0">
              {/* Main Image */}
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-border bg-muted aspect-square sm:aspect-[3/4]">
                {mainImage ? (
                  <Image
                    src={mainImage}
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
                {game.weight && (
                  <div className="px-3 sm:px-5 py-2 sm:py-3 bg-muted rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium backdrop-blur-sm border border-border">
                    <span className="text-muted-foreground block text-[10px] sm:text-xs mb-0.5 sm:mb-1">Complexity</span>
                    <span className="text-foreground flex items-center gap-1.5">
                      <Brain className="size-4" />
                      {game.weight.toFixed(1)}/5
                    </span>
                  </div>
                )}
                {game.bggRank && (
                  <div className="px-3 sm:px-5 py-2 sm:py-3 bg-muted rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium backdrop-blur-sm border border-border">
                    <span className="text-muted-foreground block text-[10px] sm:text-xs mb-0.5 sm:mb-1">BGG Rank</span>
                    <span className="text-foreground flex items-center gap-1.5">
                      <Award className="size-4" />
                      #{game.bggRank.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* BGG Stats Row - Rating breakdown */}
              {(game.rating && game.numRatings) && (
                <div className="mb-6 sm:mb-8 flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="size-4 text-primary" />
                  <span>
                    <span className="text-primary font-semibold">{game.rating.toFixed(1)}</span> average rating from{" "}
                    <span className="font-medium">{game.numRatings.toLocaleString()}</span> {game.numRatings === 1 ? "rating" : "ratings"}
                  </span>
                </div>
              )}

              {/* Designers */}
              {game.designers && game.designers.length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-base sm:text-lg font-semibold text-muted-foreground mb-2 sm:mb-3">
                    {game.designers.length === 1 ? "Designer" : "Designers"}
                  </h2>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {game.designers.map((designer: string, i: number) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/30 text-xs sm:text-sm"
                      >
                        {designer}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {game.description && (
                <div className="mb-6 sm:mb-8">
                  <h2 className="text-base sm:text-lg font-semibold text-muted-foreground mb-2 sm:mb-3">About</h2>
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                    {game.description}
                  </p>
                </div>
              )}

              {/* Works With Section - For expansions, show compatible base games */}
              {game.isExpansion && game.expandsGames.length > 0 && (
                <div className="mb-6 sm:mb-8">
                  <h2 className="text-base sm:text-lg font-semibold text-muted-foreground mb-2 sm:mb-3 flex items-center gap-2">
                    <Puzzle className="size-4" />
                    Works with {game.expandsGames.length > 1 ? `(${game.expandsGames.length} games)` : ""}
                  </h2>
                  <div className="space-y-2">
                    {game.expandsGames.map((baseGame) => (
                      <Link
                        key={baseGame.id}
                        href={`/game/${baseGame.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/50 transition-all group"
                      >
                        {baseGame.thumbnail ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden relative flex-shrink-0">
                            <Image
                              src={baseGame.thumbnail}
                              alt={baseGame.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Dice6 className="size-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate block">
                            {baseGame.name}
                          </span>
                          {!baseGame.inCollection && (
                            <span className="flex items-center gap-1 text-xs text-amber-500 mt-0.5">
                              <AlertTriangle className="size-3" />
                              Not in your collection
                            </span>
                          )}
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Games Section - For expansions that need other games */}
              {game.requiredGames.length > 0 && (
                <div className="mb-6 sm:mb-8">
                  <h2 className="text-base sm:text-lg font-semibold text-muted-foreground mb-2 sm:mb-3 flex items-center gap-2">
                    <AlertTriangle className="size-4 text-amber-500" />
                    Requires ({game.requiredGames.length})
                  </h2>
                  <div className="space-y-2">
                    {game.requiredGames.map((required) => (
                      <Link
                        key={required.id}
                        href={`/game/${required.id}`}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all group",
                          required.inCollection
                            ? "border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/50"
                            : "border-red-500/30 bg-red-500/10 hover:bg-red-500/20"
                        )}
                      >
                        {required.thumbnail ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden relative flex-shrink-0">
                            <Image
                              src={required.thumbnail}
                              alt={required.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Dice6 className="size-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate block">
                            {required.name}
                          </span>
                          {!required.inCollection && (
                            <span className="flex items-center gap-1 text-xs text-red-500 mt-0.5">
                              <AlertTriangle className="size-3" />
                              Missing from collection
                            </span>
                          )}
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning for expansions without any base game info */}
              {game.isExpansion && game.expandsGames.length === 0 && (
                <div className="mb-6 sm:mb-8">
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500 text-sm">
                    <AlertTriangle className="size-4 flex-shrink-0" />
                    <span>Base game information not yet available. Try re-scraping this game.</span>
                  </div>
                </div>
              )}

              {/* Expansions Section - For base games, show expansions that work with this game */}
              {!game.isExpansion && game.expansions.length > 0 && (
                <div className="mb-6 sm:mb-8">
                  <h2 className="text-base sm:text-lg font-semibold text-muted-foreground mb-2 sm:mb-3 flex items-center gap-2">
                    <Puzzle className="size-4" />
                    Expansions ({game.expansions.length})
                  </h2>
                  <div className="space-y-2">
                    {game.expansions.map((expansion) => (
                      <Link
                        key={expansion.id}
                        href={`/game/${expansion.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/50 transition-all group"
                      >
                        {expansion.thumbnail ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden relative flex-shrink-0">
                            <Image
                              src={expansion.thumbnail}
                              alt={expansion.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Puzzle className="size-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate block">
                            {expansion.name}
                          </span>
                          {expansion.inCollection && (
                            <span className="text-xs text-emerald-500 mt-0.5">In collection</span>
                          )}
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </Link>
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

              {/* Play History */}
              {plays.length > 0 && (
                <div className="mb-6 sm:mb-8">
                  <h2 className="text-base sm:text-lg font-semibold text-muted-foreground mb-2 sm:mb-3">
                    Play History ({plays.length} {plays.length === 1 ? "play" : "plays"})
                  </h2>
                  <div className="space-y-3">
                    {plays.map((play) => {
                      const playDate = new Date(play.playedAt);
                      const dateStr = playDate.toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      });

                      return (
                        <div
                          key={play.id}
                          className="p-3 sm:p-4 rounded-lg border border-border bg-muted/30 group"
                        >
                          {/* Header: Date, Location, Duration + Actions */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                              <span className="font-medium">{dateStr}</span>
                              {play.location && (
                                <>
                                  <span>•</span>
                                  <span>{play.location}</span>
                                </>
                              )}
                              {play.duration && (
                                <>
                                  <span>•</span>
                                  <span>{play.duration} min</span>
                                </>
                              )}
                            </div>

                            {/* Edit/Delete Actions */}
                            {canModifyPlay(play) && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingPlay(play)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingPlay(play)}
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Expansions Used */}
                          {play.expansionsUsed && play.expansionsUsed.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                              <Package className="size-3" />
                              <span>
                                With: {play.expansionsUsed.map(e => e.name).join(", ")}
                              </span>
                            </div>
                          )}

                          {/* Players with inline badges */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {play.players.map((player, idx) => (
                              <span
                                key={idx}
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                                  player.isWinner
                                    ? "bg-amber-600/20 text-amber-500"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {player.isWinner && <Trophy className="size-3" />}
                                {player.name}
                              </span>
                            ))}
                          </div>

                          {/* Notes */}
                          {play.notes && (
                            <div className="mt-2 text-sm text-foreground italic">
                              &ldquo;{play.notes}&rdquo;
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                  {/* Light mode logo */}
                  <Image
                    src="/powered-by-bgg-rgb.svg"
                    alt="Powered by BoardGameGeek"
                    width={120}
                    height={24}
                    className="h-5 sm:h-6 w-auto opacity-80 group-hover:opacity-100 transition-opacity dark:hidden"
                  />
                  {/* Dark mode logo */}
                  <Image
                    src="/powered-by-bgg.svg"
                    alt="Powered by BoardGameGeek"
                    width={120}
                    height={24}
                    className="h-5 sm:h-6 w-auto opacity-80 group-hover:opacity-100 transition-opacity hidden dark:block"
                  />
                  <ExternalLink className="size-3 sm:size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create List Dialog */}
      <CreateListDialog
        open={showCreateListDialog}
        onOpenChange={setShowCreateListDialog}
        onCreated={handleListCreated}
      />

      {/* Log Play Dialog */}
      <LogPlayDialog
        open={showLogPlayDialog}
        onOpenChange={setShowLogPlayDialog}
        gameId={game.id}
        gameName={game.name}
        onPlayLogged={() => {
          router.refresh();
        }}
        availableExpansions={game.expansions
          .filter(e => e.inCollection)
          .map(e => ({ id: e.id, name: e.name, thumbnail: e.thumbnail }))}
      />

      {/* Edit Play Dialog */}
      {editingPlay && (
        <EditPlayDialog
          open={!!editingPlay}
          onOpenChange={(open) => !open && setEditingPlay(null)}
          play={editingPlay}
          onPlayUpdated={() => {
            router.refresh();
          }}
          availableExpansions={game.expansions
            .filter(e => e.inCollection)
            .map(e => ({ id: e.id, name: e.name, thumbnail: e.thumbnail }))}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingPlay}
        onOpenChange={(open) => !open && setDeletingPlay(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Play?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this play log. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlay}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
