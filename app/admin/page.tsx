"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Game {
  id: string;
  name: string;
  yearPublished: number | null;
  isActive: boolean;
  isExpansion: boolean;
  lastScraped: string | null;
  image: string | null;
  thumbnail: string | null;
  selectedThumbnail: string | null;
  availableImages: string[];
  componentImages: string[];
  rating: number | null;
}

interface SyncStatus {
  lastSync: {
    syncedAt: string;
    gamesFound: number;
    status: string;
  } | null;
  stats: {
    total: number;
    active: number;
    scraped: number;
  };
}

interface ImageEditorProps {
  game: Game;
  onClose: () => void;
  onSave: () => void;
}

function ImageEditor({ game, onClose, onSave }: ImageEditorProps) {
  const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(
    game.selectedThumbnail
  );
  const [componentImages, setComponentImages] = useState<string[]>(
    game.componentImages || []
  );
  const [saving, setSaving] = useState(false);

  // All available images: default + gallery
  const allImages = [
    ...(game.image ? [game.image] : []),
    ...game.availableImages,
  ].filter((img, index, self) => self.indexOf(img) === index);

  const handleThumbnailSelect = (url: string) => {
    setSelectedThumbnail(url === selectedThumbnail ? null : url);
  };

  const handleComponentToggle = (url: string) => {
    if (componentImages.includes(url)) {
      setComponentImages(componentImages.filter((img) => img !== url));
    } else {
      setComponentImages([...componentImages, url]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/games/${game.id}/preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedThumbnail, componentImages }),
      });
      onSave();
      onClose();
    } catch (error) {
      console.error("Failed to save preferences:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-stone-900 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-stone-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{game.name}</h2>
            <p className="text-stone-400 text-sm mt-1">
              Select thumbnail and component images
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {allImages.length === 0 ? (
            <div className="text-center py-12 text-stone-500">
              <p>No images available. Scrape this game first to fetch images.</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Thumbnail
                  <span className="text-stone-400 font-normal ml-2 text-sm">
                    (Click to select main image)
                  </span>
                </h3>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => handleThumbnailSelect(img)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all relative ${
                        selectedThumbnail === img
                          ? "border-amber-500 ring-2 ring-amber-500/50"
                          : img === game.image && !selectedThumbnail
                          ? "border-blue-500/50"
                          : "border-stone-700 hover:border-stone-500"
                      }`}
                    >
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {selectedThumbnail === img && (
                        <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                          <span className="bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded">
                            THUMB
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Component Images
                  <span className="text-stone-400 font-normal ml-2 text-sm">
                    (Click to toggle selection)
                  </span>
                </h3>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => handleComponentToggle(img)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all relative ${
                        componentImages.includes(img)
                          ? "border-emerald-500 ring-2 ring-emerald-500/50"
                          : "border-stone-700 hover:border-stone-500"
                      }`}
                    >
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {componentImages.includes(img) && (
                        <div className="absolute top-1 right-1 bg-emerald-500 text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {componentImages.indexOf(img) + 1}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-stone-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-stone-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [scraping, setScraping] = useState<string | null>(null);
  const [scrapingAll, setScrapingAll] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "scraped">("all");

  const fetchGames = useCallback(async () => {
    const response = await fetch("/api/games");
    const data = await response.json();
    setGames(data.games);
  }, []);

  const fetchSyncStatus = useCallback(async () => {
    const response = await fetch("/api/collection/import");
    const data = await response.json();
    setSyncStatus(data);
  }, []);

  useEffect(() => {
    Promise.all([fetchGames(), fetchSyncStatus()]).finally(() => setLoading(false));
  }, [fetchGames, fetchSyncStatus]);

  const handleImport = async () => {
    setImporting(true);
    try {
      await fetch("/api/collection/import", { method: "POST" });
      await Promise.all([fetchGames(), fetchSyncStatus()]);
    } finally {
      setImporting(false);
    }
  };

  const handleToggleActive = async (game: Game) => {
    await fetch(`/api/games/${game.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !game.isActive }),
    });
    await fetchGames();
  };

  const handleScrape = async (gameId: string) => {
    setScraping(gameId);
    try {
      await fetch(`/api/games/${gameId}/scrape`, { method: "POST" });
      await fetchGames();
    } finally {
      setScraping(null);
    }
  };

  const handleScrapeAll = async () => {
    setScrapingAll(true);
    try {
      await fetch("/api/games/scrape-active", { method: "POST" });
      await fetchGames();
    } finally {
      setScrapingAll(false);
    }
  };

  const filteredGames = games.filter((game) => {
    if (filter === "active") return game.isActive;
    if (filter === "scraped") return game.lastScraped !== null;
    return true;
  });

  const activeCount = games.filter((g) => g.isActive).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      {/* Header */}
      <header className="bg-stone-900 border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-stone-400 hover:text-white transition-colors"
            >
              ← Back
            </Link>
            <h1 className="text-2xl font-bold">Admin</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Import Panel */}
        <section className="bg-stone-900 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Collection Import</h2>
              <p className="text-stone-400 text-sm mt-1">
                Import your BGG collection to sync games
              </p>
            </div>
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {importing ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Importing...
                </>
              ) : (
                "Import from BGG"
              )}
            </button>
          </div>

          {syncStatus && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-stone-800 rounded-lg p-4">
                <div className="text-3xl font-bold text-white">
                  {syncStatus.stats.total}
                </div>
                <div className="text-stone-400 text-sm">Total Games</div>
              </div>
              <div className="bg-stone-800 rounded-lg p-4">
                <div className="text-3xl font-bold text-amber-400">
                  {syncStatus.stats.active}
                </div>
                <div className="text-stone-400 text-sm">Active</div>
              </div>
              <div className="bg-stone-800 rounded-lg p-4">
                <div className="text-3xl font-bold text-emerald-400">
                  {syncStatus.stats.scraped}
                </div>
                <div className="text-stone-400 text-sm">Scraped</div>
              </div>
              <div className="bg-stone-800 rounded-lg p-4">
                <div className="text-sm text-white">
                  {syncStatus.lastSync
                    ? new Date(syncStatus.lastSync.syncedAt).toLocaleString()
                    : "Never"}
                </div>
                <div className="text-stone-400 text-sm">Last Sync</div>
              </div>
            </div>
          )}
        </section>

        {/* Games List */}
        <section className="bg-stone-900 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">Games</h2>
              <div className="flex gap-1 bg-stone-800 rounded-lg p-1">
                {(["all", "active", "scraped"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded text-sm transition-colors ${
                      filter === f
                        ? "bg-amber-600 text-white"
                        : "text-stone-400 hover:text-white"
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleScrapeAll}
              disabled={scrapingAll || activeCount === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {scrapingAll ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Scraping...
                </>
              ) : (
                `Scrape Active (${activeCount})`
              )}
            </button>
          </div>

          <div className="divide-y divide-stone-800">
            {filteredGames.map((game) => (
              <div
                key={game.id}
                className="p-4 flex items-center gap-4 hover:bg-stone-800/50 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-800 flex-shrink-0">
                  {(game.selectedThumbnail || game.thumbnail || game.image) ? (
                    <img
                      src={game.selectedThumbnail || game.thumbnail || game.image || ""}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      🎲
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white truncate">{game.name}</h3>
                    {game.isExpansion && (
                      <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                        Expansion
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-stone-400 mt-1">
                    {game.yearPublished && <span>{game.yearPublished}</span>}
                    {game.lastScraped && (
                      <span className="text-emerald-400">
                        Scraped {new Date(game.lastScraped).toLocaleDateString()}
                      </span>
                    )}
                    {game.rating && (
                      <span className="text-amber-400">★ {game.rating.toFixed(1)}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(game)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      game.isActive
                        ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                        : "bg-stone-700 text-stone-400 hover:text-white"
                    }`}
                  >
                    {game.isActive ? "Active" : "Inactive"}
                  </button>

                  <button
                    onClick={() => handleScrape(game.id)}
                    disabled={scraping === game.id}
                    className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {scraping === game.id ? "..." : "Scrape"}
                  </button>

                  <button
                    onClick={() => setSelectedGame(game)}
                    disabled={!game.lastScraped}
                    className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    title={game.lastScraped ? "Edit images" : "Scrape first to edit images"}
                  >
                    Images
                  </button>
                </div>
              </div>
            ))}

            {filteredGames.length === 0 && (
              <div className="p-12 text-center text-stone-500">
                {games.length === 0
                  ? "No games yet. Import your collection from BGG to get started."
                  : "No games match the current filter."}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Image Editor Modal */}
      {selectedGame && (
        <ImageEditor
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onSave={fetchGames}
        />
      )}
    </div>
  );
}
