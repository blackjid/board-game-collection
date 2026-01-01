"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Play,
  User,
  Search,
  X,
  LayoutGrid,
  List,
  Settings as SettingsIcon,
  LogIn,
  Printer,
  ExternalLink
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { GameCard } from "@/components/GameCard";
import { GameListItem } from "@/components/GameListItem";
import { UserMenu } from "@/components/UserMenu";
import type { GameData } from "@/lib/games";

type SortOption = "name" | "year" | "rating";
type ViewMode = "grid" | "list";

interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface HomeClientProps {
  games: GameData[];
  totalGames: number;
  collectionName: string | null;
  bggUsername: string | null;
  lastSyncedAt: string | null;
  currentUser: CurrentUser | null;
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Never";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function HomeClient({
  games,
  totalGames,
  collectionName,
  bggUsername,
  lastSyncedAt,
  currentUser,
}: HomeClientProps) {
  const router = useRouter();
  const [columns, setColumns] = useState(6);
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [syncing, setSyncing] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  const filteredAndSortedGames = useMemo(() => {
    let result = [...games];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(game =>
        game.name.toLowerCase().includes(query)
      );
    }

    // Sort
    return result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "year":
          if (a.yearPublished === null) return 1;
          if (b.yearPublished === null) return -1;
          return b.yearPublished - a.yearPublished;
        case "rating":
          if (a.rating === null) return 1;
          if (b.rating === null) return -1;
          return b.rating - a.rating;
        default:
          return 0;
      }
    });
  }, [games, sortBy, searchQuery]);

  const handleQuickSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/collection/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipAutoScrape: false }),
      });
      router.refresh();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Header */}
      <header className="bg-gradient-to-b from-card to-card/95 border-b border-border print:hidden sticky top-0 z-30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          {/* Main header row */}
          <div className="flex items-center justify-between gap-4">
            {/* Left: Title and meta */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate">
                <span className="text-foreground">{collectionName || (bggUsername ? `${bggUsername}'s` : "Board Game")}</span>
                <span className="text-primary/80 font-light ml-2 italic">Collection</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-muted-foreground text-sm">
                  {totalGames} game{totalGames !== 1 ? "s" : ""}
                </span>
                {lastSyncedAt && isAdmin && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-muted-foreground text-sm">
                      Synced {formatRelativeTime(lastSyncedAt)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Quick Sync - Admin only */}
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleQuickSync}
                  disabled={syncing}
                  className="gap-2"
                  title="Sync collection"
                >
                  <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
                  <span className="hidden sm:inline">{syncing ? "Syncing..." : "Sync"}</span>
                </Button>
              )}

              {/* Pick a Game Button */}
              <Button asChild className="gap-2 shadow-lg shadow-primary/20">
                <Link href="/pick">
                  <Play className="size-4" />
                  <span className="hidden sm:inline">Pick a Game</span>
                </Link>
              </Button>

              {/* User Menu or Login */}
              {currentUser ? (
                <UserMenu user={currentUser} />
              ) : (
                <Button variant="ghost" size="sm" asChild className="gap-2" title="Admin login">
                  <Link href="/login">
                    <User className="size-4" />
                    <span className="hidden sm:inline">Login</span>
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Search bar - below title on mobile, inline on desktop */}
          {games.length > 0 && (
            <div className="mt-4 sm:mt-3">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
                  >
                    <X className="size-4" />
                    <span className="sr-only">Clear search</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Print Header */}
      <div className="hidden print:flex print:mb-3 print:border-b print:border-stone-300 print:pb-2 print:items-baseline print:justify-between">
        <h1 className="text-base font-bold text-stone-800">
          {collectionName || (bggUsername ? `${bggUsername}'s` : "Board Game")} <span className="font-normal italic">Collection</span>
        </h1>
        <p className="text-stone-500 text-[10px]">{totalGames} games</p>
      </div>

      {/* View Controls Bar - Compact strip */}
      {games.length > 0 && (
        <div className="bg-muted/30 border-b border-border py-2.5 px-4 sm:px-6 print:hidden">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Left: View toggle and sort */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* View Toggle */}
              <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon-sm"
                  onClick={() => setViewMode("grid")}
                  title="Grid view"
                >
                  <LayoutGrid className="size-4" />
                  <span className="sr-only">Grid view</span>
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon-sm"
                  onClick={() => setViewMode("list")}
                  title="List view"
                >
                  <List className="size-4" />
                  <span className="sr-only">List view</span>
                </Button>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-xs hidden sm:inline">Sort:</span>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger size="sm" className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right: Size slider (grid only) */}
            {viewMode === "grid" && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs hidden sm:inline">Size:</span>
                <input
                  id="card-size"
                  type="range"
                  min="3"
                  max="10"
                  value={columns}
                  onChange={(e) => setColumns(Number(e.target.value))}
                  className="w-20 sm:w-24 accent-primary"
                />
                <span className="text-muted-foreground text-xs w-6 text-right">{columns}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Games Grid/List */}
      <main className="max-w-7xl mx-auto px-6 py-8 print:px-0 print:py-0 print:max-w-none print:mx-0">
        {games.length === 0 ? (
          // Onboarding Empty State
          <div className="text-center py-16 sm:py-24">
            <div className="relative inline-block mb-6">
              <div className="text-7xl sm:text-8xl animate-bounce">🎲</div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full animate-ping opacity-75" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Welcome to Your Collection!
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Get started by setting up your BoardGameGeek collection. It only takes a minute!
            </p>

            {/* Onboarding Steps */}
            <div className="max-w-sm mx-auto mb-8">
              <div className="space-y-4 text-left">
                <Card className={cn("py-0", currentUser && "border-emerald-500/50")}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className={cn(
                      "size-8 rounded-full flex items-center justify-center text-sm font-bold",
                      currentUser ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {currentUser ? "✓" : "1"}
                    </div>
                    <div className="flex-1">
                      <p className={cn("font-medium", currentUser ? "text-emerald-400" : "text-foreground")}>
                        Login as admin
                      </p>
                      <p className="text-muted-foreground text-sm">Access the settings panel</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn("py-0", bggUsername && "border-emerald-500/50")}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className={cn(
                      "size-8 rounded-full flex items-center justify-center text-sm font-bold",
                      bggUsername ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {bggUsername ? "✓" : "2"}
                    </div>
                    <div className="flex-1">
                      <p className={cn("font-medium", bggUsername ? "text-emerald-400" : "text-foreground")}>
                        Set your BGG username
                      </p>
                      <p className="text-muted-foreground text-sm">Connect to BoardGameGeek</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="py-0">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="size-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Sync your collection</p>
                      <p className="text-muted-foreground text-sm">Import games from BGG</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {currentUser ? (
              <Button asChild size="lg" className="gap-2 shadow-lg shadow-primary/20">
                <Link href="/settings?section=collection">
                  <SettingsIcon className="size-5" />
                  Go to Settings
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="gap-2 shadow-lg shadow-primary/20">
                <Link href="/login">
                  <LogIn className="size-5" />
                  Login to Get Started
                </Link>
              </Button>
            )}
          </div>
        ) : filteredAndSortedGames.length === 0 ? (
          // No search results
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-foreground mb-2">No games found</h2>
            <p className="text-muted-foreground mb-4">
              No games match &quot;{searchQuery}&quot;
            </p>
            <Button variant="link" onClick={() => setSearchQuery("")} className="text-primary">
              Clear search
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <>
            <style>{`
              @media (min-width: 640px) {
                .game-grid-custom {
                  grid-template-columns: repeat(${columns}, minmax(0, 1fr)) !important;
                }
              }
            `}</style>
            <div className="game-grid-custom grid gap-3 sm:gap-4 grid-cols-2 print:grid-cols-6 print:gap-2">
              {filteredAndSortedGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredAndSortedGames.map((game) => (
              <GameListItem key={game.id} game={game} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-4">
          <a
            href="https://boardgamegeek.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group px-4 py-2 rounded-lg hover:bg-muted/50 transition-all"
          >
            <Image
              src="/powered-by-bgg.svg"
              alt="Powered by BoardGameGeek"
              width={200}
              height={40}
              className="h-10 w-auto opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </a>
          <div className="flex items-center gap-3 text-muted-foreground text-xs">
            {bggUsername && (
              <>
                <a
                  href={`https://boardgamegeek.com/collection/user/${bggUsername}`}
                  className="hover:text-primary transition-colors inline-flex items-center gap-1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on BGG
                  <ExternalLink className="size-3" />
                </a>
                <span>•</span>
              </>
            )}
            {games.length > 0 && (
              <button
                onClick={() => window.print()}
                className="hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <Printer className="size-3" />
                Print Collection
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
