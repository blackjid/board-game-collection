"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const displayName = collectionName || (bggUsername ? `${bggUsername}'s Collection` : "Board Game Collection");
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
    <div className="min-h-screen bg-stone-950 print:bg-white">
      {/* Header */}
      <header className="bg-gradient-to-b from-stone-900 to-stone-900/95 border-b border-stone-800/80 print:hidden sticky top-0 z-30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          {/* Main header row */}
          <div className="flex items-center justify-between gap-4">
            {/* Left: Title and meta */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate">
                <span className="text-white">{collectionName || (bggUsername ? `${bggUsername}'s` : "Board Game")}</span>
                <span className="text-amber-500/80 font-light ml-2 italic">Collection</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-stone-400 text-sm">
                  {totalGames} game{totalGames !== 1 ? "s" : ""}
                </span>
                {lastSyncedAt && isAdmin && (
                  <>
                    <span className="text-stone-600">•</span>
                    <span className="text-stone-500 text-sm">
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
                <button
                  onClick={handleQuickSync}
                  disabled={syncing}
                  className="p-2 sm:px-3 sm:py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg text-sm font-medium transition-all border border-stone-700 disabled:opacity-50 flex items-center gap-2"
                  title="Sync collection"
                >
                  <svg
                    className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">{syncing ? "Syncing..." : "Sync"}</span>
                </button>
              )}

              {/* Experience Button */}
              <Link
                href="/experience"
                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline">Experience</span>
              </Link>

              {/* User Menu or Login */}
              {currentUser ? (
                <UserMenu user={currentUser} />
              ) : (
                <Link
                  href="/login"
                  className="p-2 sm:px-3 sm:py-2 text-stone-400 hover:text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 hover:bg-stone-800"
                  title="Admin login"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="hidden sm:inline">Login</span>
                </Link>
              )}
            </div>
          </div>

          {/* Search bar - below title on mobile, inline on desktop */}
          {games.length > 0 && (
            <div className="mt-4 sm:mt-3">
              <div className="relative max-w-md">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-800/60 border border-stone-700/50 rounded-xl text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 focus:bg-stone-800 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
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
        <div className="bg-stone-900/30 border-b border-stone-800/50 py-2.5 px-4 sm:px-6 print:hidden">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Left: View toggle and sort */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* View Toggle */}
              <div className="flex items-center gap-0.5 bg-stone-800/80 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded transition-colors ${
                    viewMode === "grid"
                      ? "bg-amber-600 text-white"
                      : "text-stone-400 hover:text-white"
                  }`}
                  title="Grid view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded transition-colors ${
                    viewMode === "list"
                      ? "bg-amber-600 text-white"
                      : "text-stone-400 hover:text-white"
                  }`}
                  title="List view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 text-xs hidden sm:inline">Sort:</span>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-stone-800/60 border border-stone-700/50 rounded-md px-2 py-1 text-sm text-stone-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50 cursor-pointer hover:bg-stone-800 transition-colors appearance-none pr-6"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2378716c'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', backgroundSize: '16px' }}
                >
                  <option value="name" className="bg-stone-900">Name</option>
                  <option value="year" className="bg-stone-900">Year</option>
                  <option value="rating" className="bg-stone-900">Rating</option>
                </select>
              </div>
            </div>

            {/* Right: Size slider (grid only) */}
            {viewMode === "grid" && (
              <div className="flex items-center gap-2">
                <span className="text-stone-500 text-xs hidden sm:inline">Size:</span>
                <input
                  id="card-size"
                  type="range"
                  min="3"
                  max="10"
                  value={columns}
                  onChange={(e) => setColumns(Number(e.target.value))}
                  className="w-20 sm:w-24 accent-amber-500"
                />
                <span className="text-stone-500 text-xs w-6 text-right">{columns}</span>
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
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full animate-ping opacity-75" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Welcome to Your Collection!
            </h2>
            <p className="text-stone-400 mb-8 max-w-md mx-auto">
              Get started by setting up your BoardGameGeek collection. It only takes a minute!
            </p>

            {/* Onboarding Steps */}
            <div className="max-w-sm mx-auto mb-8">
              <div className="space-y-4 text-left">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-stone-900/50 border border-stone-800">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    currentUser ? "bg-emerald-500 text-white" : "bg-stone-800 text-stone-400"
                  }`}>
                    {currentUser ? "✓" : "1"}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${currentUser ? "text-emerald-400" : "text-white"}`}>
                      Login as admin
                    </p>
                    <p className="text-stone-500 text-sm">Access the settings panel</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-stone-900/50 border border-stone-800">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    bggUsername ? "bg-emerald-500 text-white" : "bg-stone-800 text-stone-400"
                  }`}>
                    {bggUsername ? "✓" : "2"}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${bggUsername ? "text-emerald-400" : "text-white"}`}>
                      Set your BGG username
                    </p>
                    <p className="text-stone-500 text-sm">Connect to BoardGameGeek</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-stone-900/50 border border-stone-800">
                  <div className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">Sync your collection</p>
                    <p className="text-stone-500 text-sm">Import games from BGG</p>
                  </div>
                </div>
              </div>
            </div>

            {currentUser ? (
              <Link
                href="/settings?section=collection"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg shadow-amber-500/20"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Go to Settings
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg shadow-amber-500/20"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Login to Get Started
              </Link>
            )}
          </div>
        ) : filteredAndSortedGames.length === 0 ? (
          // No search results
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-white mb-2">No games found</h2>
            <p className="text-stone-400 mb-4">
              No games match &quot;{searchQuery}&quot;
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="text-amber-500 hover:text-amber-400 font-medium"
            >
              Clear search
            </button>
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

      {/* Admin FAB - Mobile only */}
      {isAdmin && games.length > 0 && (
        <Link
          href="/settings?section=collection"
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-full shadow-lg shadow-amber-500/30 flex items-center justify-center sm:hidden z-40 transition-transform hover:scale-110 active:scale-95"
          title="Settings"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      )}

      {/* Footer */}
      <footer className="border-t border-stone-800 py-6 px-6 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-4">
          <a
            href="https://boardgamegeek.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group px-4 py-2 rounded-lg hover:bg-stone-900/50 transition-all"
          >
            <img
              src="/powered-by-bgg.svg"
              alt="Powered by BoardGameGeek"
              className="h-10 opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </a>
          <div className="flex items-center gap-3 text-stone-600 text-xs">
            {bggUsername && (
              <>
                <a
                  href={`https://boardgamegeek.com/collection/user/${bggUsername}`}
                  className="hover:text-amber-400 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on BGG
                </a>
                <span>•</span>
              </>
            )}
            {games.length > 0 && (
              <button
                onClick={() => window.print()}
                className="hover:text-amber-400 transition-colors"
              >
                Print Collection
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
