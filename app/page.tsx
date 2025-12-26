"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import gamesData from "@/data/games.json";
import { GameCard } from "@/components/GameCard";
import { GameListItem } from "@/components/GameListItem";

type SortOption = "name" | "year" | "rating";
type ViewMode = "grid" | "list";

export default function Home() {
  const { games, username, fetchedAt, totalGames } = gamesData;
  const [columns, setColumns] = useState(6);
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const sortedGames = useMemo(() => {
    return [...games].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "year":
          // Sort by year descending (newest first), nulls last
          if (a.yearPublished === null) return 1;
          if (b.yearPublished === null) return -1;
          return b.yearPublished - a.yearPublished;
        case "rating":
          // Sort by rating descending (highest first), nulls last
          if (a.rating === null) return 1;
          if (b.rating === null) return -1;
          return b.rating - a.rating;
        default:
          return 0;
      }
    });
  }, [games, sortBy]);

  return (
    <div className="min-h-screen bg-stone-50 print:bg-white">
      {/* Header - hidden when printing */}
      <header className="bg-gradient-to-r from-amber-800 via-amber-700 to-amber-800 text-white py-8 px-6 print:hidden">
        <div className="max-w-7xl mx-auto flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight font-serif">
              Board Game Collection
            </h1>
            <p className="mt-2 text-amber-100 text-lg">
              {username}&apos;s collection • {totalGames} games
            </p>
            <p className="text-amber-200/70 text-sm mt-1">
              Last updated: {new Date(fetchedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Link
            href="/experience"
            className="group relative bg-black/20 hover:bg-black/30 backdrop-blur-sm px-5 py-3 rounded-xl text-sm font-medium transition-all hover:scale-105 border border-white/20 hover:border-white/40"
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Experience
            </span>
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-amber-200/60 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              Immersive scroll
            </span>
          </Link>
        </div>
      </header>

      {/* Print Header - compact */}
      <div className="hidden print:flex print:mb-3 print:border-b print:border-stone-300 print:pb-2 print:items-baseline print:justify-between">
        <h1 className="text-base font-bold text-stone-800">
          {username}&apos;s Board Game Collection
        </h1>
        <p className="text-stone-500 text-[10px]">
          {totalGames} games • {new Date(fetchedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Action Bar - hidden when printing */}
      <div className="bg-stone-100 border-b border-stone-200 py-4 px-6 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-white border border-stone-300 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-2.5 py-1.5 rounded text-sm transition-colors ${
                  viewMode === "grid"
                    ? "bg-amber-700 text-white"
                    : "text-stone-600 hover:bg-stone-100"
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
                    ? "bg-amber-700 text-white"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
                title="List view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* Card Size - only show in grid mode */}
            {viewMode === "grid" && (
              <div className="flex items-center gap-3">
                <label htmlFor="card-size" className="text-stone-600 text-sm whitespace-nowrap">
                  Card size:
                </label>
                <input
                  id="card-size"
                  type="range"
                  min="3"
                  max="10"
                  value={columns}
                  onChange={(e) => setColumns(Number(e.target.value))}
                  className="w-32 accent-amber-700"
                />
                <span className="text-stone-500 text-xs w-16">{columns} cols</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label htmlFor="sort-by" className="text-stone-600 text-sm whitespace-nowrap">
                Sort by:
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-white border border-stone-300 rounded-md px-2 py-1 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="name">Name (A-Z)</option>
                <option value="year">Year (Newest)</option>
                <option value="rating">Rating (Highest)</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Print Collection
          </button>
        </div>
      </div>

      {/* Games Grid/List */}
      <main className="max-w-7xl mx-auto px-6 py-8 print:px-0 print:py-0 print:max-w-none print:mx-0">
        {viewMode === "grid" ? (
          <div
            className="grid gap-4 print:grid-cols-6 print:gap-2"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {sortedGames.map((game) => (
              <GameCard key={game.id || game.name} game={game} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedGames.map((game) => (
              <GameListItem key={game.id || game.name} game={game} />
            ))}
          </div>
        )}
      </main>

      {/* Footer - hidden when printing */}
      <footer className="bg-stone-100 border-t border-stone-200 py-6 px-6 print:hidden">
        <div className="max-w-7xl mx-auto text-center text-stone-500 text-sm">
          Data from{" "}
          <a
            href={`https://boardgamegeek.com/collection/user/${username}`}
            className="text-amber-700 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            BoardGameGeek
          </a>
        </div>
      </footer>
    </div>
  );
}
