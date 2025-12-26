"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { GameCard } from "@/components/GameCard";
import { GameListItem } from "@/components/GameListItem";
import type { GameData } from "@/lib/games";

type SortOption = "name" | "year" | "rating";
type ViewMode = "grid" | "list";

interface HomeClientProps {
  games: GameData[];
  totalGames: number;
  collectionName: string | null;
  bggUsername: string | null;
}

export function HomeClient({ games, totalGames, collectionName, bggUsername }: HomeClientProps) {
  const displayName = collectionName || (bggUsername ? `${bggUsername}'s collection` : "My Collection");
  const [columns, setColumns] = useState(6);
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const sortedGames = useMemo(() => {
    return [...games].sort((a, b) => {
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
  }, [games, sortBy]);

  return (
    <div className="min-h-screen bg-stone-950 print:bg-white">
      {/* Header */}
      <header className="bg-stone-900 border-b border-stone-800 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {displayName}
            </h1>
            <p className="mt-0.5 sm:mt-1 text-stone-400 text-sm sm:text-base">
              {totalGames} games
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/settings"
              className="px-3 sm:px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg text-sm font-medium transition-colors border border-stone-700"
            >
              Settings
            </Link>
            <Link
              href="/experience"
              className="px-3 sm:px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden xs:inline">Experience</span>
              <span className="xs:hidden">Exp</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Print Header */}
      <div className="hidden print:flex print:mb-3 print:border-b print:border-stone-300 print:pb-2 print:items-baseline print:justify-between">
        <h1 className="text-base font-bold text-stone-800">
          {displayName}
        </h1>
        <p className="text-stone-500 text-[10px]">
          {totalGames} games
        </p>
      </div>

      {/* Action Bar */}
      <div className="bg-stone-900/50 border-b border-stone-800 py-3 sm:py-4 px-4 sm:px-6 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-stone-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-2.5 py-1.5 rounded text-sm transition-colors ${
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
                className={`px-2.5 py-1.5 rounded text-sm transition-colors ${
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

            {/* Card Size - hidden on mobile */}
            {viewMode === "grid" && (
              <div className="hidden sm:flex items-center gap-3">
                <label htmlFor="card-size" className="text-stone-400 text-sm whitespace-nowrap">
                  Size:
                </label>
                <input
                  id="card-size"
                  type="range"
                  min="3"
                  max="10"
                  value={columns}
                  onChange={(e) => setColumns(Number(e.target.value))}
                  className="w-24 accent-amber-500"
                />
                <span className="text-stone-500 text-xs w-12">{columns} cols</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label htmlFor="sort-by" className="text-stone-400 text-sm whitespace-nowrap hidden sm:inline">
                Sort:
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-stone-800 border border-stone-700 rounded-lg px-2 sm:px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="name">Name (A-Z)</option>
                <option value="year">Year (Newest)</option>
                <option value="rating">Rating (Highest)</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="px-3 sm:px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg text-sm font-medium transition-colors border border-stone-700 hidden sm:block"
          >
            Print
          </button>
        </div>
      </div>

      {/* Games Grid/List */}
      <main className="max-w-7xl mx-auto px-6 py-8 print:px-0 print:py-0 print:max-w-none print:mx-0">
        {sortedGames.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎲</div>
            <h2 className="text-2xl font-bold text-white mb-2">No games yet</h2>
            <p className="text-stone-400 mb-6">
              Import your BGG collection and activate some games to display them here.
            </p>
            <Link
              href="/settings"
              className="inline-block bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Go to Settings
            </Link>
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
            <div
              className="game-grid-custom grid gap-3 sm:gap-4 grid-cols-2 print:grid-cols-6 print:gap-2"
            >
              {sortedGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedGames.map((game) => (
              <GameListItem key={game.id} game={game} />
            ))}
          </div>
        )}
      </main>

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
          {bggUsername && (
            <p className="text-stone-600 text-xs">
              View{" "}
              <a
                href={`https://boardgamegeek.com/collection/user/${bggUsername}`}
                className="text-amber-500/70 hover:text-amber-400"
                target="_blank"
                rel="noopener noreferrer"
              >
                collection on BGG
              </a>
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
