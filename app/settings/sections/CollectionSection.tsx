"use client";

import { useState, useEffect, useCallback } from "react";

interface SyncStatus {
  lastSync: {
    syncedAt: string;
    gamesFound: number;
    status: string;
  } | null;
  bggUsername: string;
  stats: {
    total: number;
    active: number;
    scraped: number;
    unscrapedActive: number;
  };
}

interface Settings {
  bggUsername: string | null;
  syncSchedule: string;
  autoScrapeNewGames: boolean;
  lastScheduledSync: string | null;
}

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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-stone-900 rounded-xl sm:rounded-2xl max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b border-stone-700 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold text-white truncate">{game.name}</h2>
            <p className="text-stone-400 text-xs sm:text-sm mt-1">
              Select thumbnail and component images
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-2 flex-shrink-0"
          >
            <svg className="w-5 sm:w-6 h-5 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {allImages.length === 0 ? (
            <div className="text-center py-12 text-stone-500">
              <p>No images available. Scrape this game first to fetch images.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">
                  Thumbnail
                  <span className="text-stone-400 font-normal ml-2 text-xs sm:text-sm">
                    (Tap to select)
                  </span>
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
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
                      <img src={img} alt="" className="w-full h-full object-cover" />
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
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">
                  Component Images
                  <span className="text-stone-400 font-normal ml-2 text-xs sm:text-sm">
                    (Tap to toggle)
                  </span>
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
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
                      <img src={img} alt="" className="w-full h-full object-cover" />
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

        <div className="p-4 sm:p-6 border-t border-stone-700 flex justify-end gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-2 text-stone-400 hover:text-white transition-colors text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 sm:px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CollectionSection() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [settings, setSettings] = useState<Settings>({
    bggUsername: null,
    syncSchedule: "manual",
    autoScrapeNewGames: false,
    lastScheduledSync: null,
  });
  const [usernameInput, setUsernameInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUsernameWarning, setShowUsernameWarning] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncDialogAutoScrape, setSyncDialogAutoScrape] = useState(true);

  // Games state
  const [games, setGames] = useState<Game[]>([]);
  const [scraping, setScraping] = useState<string | null>(null);
  const [scrapingAll, setScrapingAll] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "scraped">("all");

  const fetchData = useCallback(async () => {
    try {
      const [syncRes, settingsRes, gamesRes] = await Promise.all([
        fetch("/api/collection/import"),
        fetch("/api/settings"),
        fetch("/api/games"),
      ]);
      const [syncData, settingsData, gamesData] = await Promise.all([
        syncRes.json(),
        settingsRes.json(),
        gamesRes.json(),
      ]);
      setSyncStatus(syncData);
      setSettings(settingsData);
      setUsernameInput(settingsData.bggUsername || "");
      setGames(gamesData.games);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSyncClick = () => {
    // Pre-set the checkbox based on the current setting
    setSyncDialogAutoScrape(settings.autoScrapeNewGames);
    setShowSyncDialog(true);
  };

  const handleSync = async (skipAutoScrape: boolean) => {
    setShowSyncDialog(false);
    setSyncing(true);
    try {
      await fetch("/api/collection/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipAutoScrape }),
      });
      await fetchData();
    } catch (error) {
      console.error("Failed to sync:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleUsernameChange = () => {
    const hasExistingCollection = syncStatus && syncStatus.stats.total > 0;
    const isChangingUsername = settings.bggUsername && usernameInput !== settings.bggUsername;

    if (hasExistingCollection && isChangingUsername) {
      setShowUsernameWarning(true);
    } else {
      saveUsername();
    }
  };

  const saveUsername = async () => {
    setSaving(true);
    setShowUsernameWarning(false);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bggUsername: usernameInput || null }),
      });
      const data = await response.json();
      setSettings(data);
      await fetchData();
    } catch (error) {
      console.error("Failed to save username:", error);
    } finally {
      setSaving(false);
    }
  };

  // Game handlers
  const handleToggleActive = async (game: Game) => {
    await fetch(`/api/games/${game.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !game.isActive }),
    });
    await fetchData();
  };

  const handleScrape = async (gameId: string) => {
    setScraping(gameId);
    try {
      await fetch(`/api/games/${gameId}/scrape`, { method: "POST" });
      await fetchData();
    } finally {
      setScraping(null);
    }
  };

  const handleScrapeAll = async () => {
    setScrapingAll(true);
    try {
      await fetch("/api/games/scrape-active", { method: "POST" });
      await fetchData();
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
      <div className="flex items-center justify-center py-12">
        <div className="text-stone-500">Loading collection data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white">Collection</h2>
        <p className="text-stone-400 text-sm mt-1">
          Manage your BoardGameGeek collection and games
        </p>
      </div>

      {/* Collection Source & Sync */}
      <div className="bg-stone-900 rounded-xl p-4 sm:p-6">
        {/* Header with username and sync button */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-3">BGG Source</h3>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md">
          <input
            type="text"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="BGG username"
                className="flex-1 px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors text-sm"
          />
          <button
            onClick={handleUsernameChange}
            disabled={saving || usernameInput === (settings.bggUsername || "")}
                className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap text-sm"
          >
                {saving ? "Saving..." : "Save"}
          </button>
        </div>
        {settings.bggUsername && usernameInput !== settings.bggUsername && usernameInput && (
              <p className="text-amber-500 text-xs mt-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
                Changing username will clear current collection
          </p>
        )}
      </div>

          <button
            onClick={handleSyncClick}
            disabled={syncing || !settings.bggUsername}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {syncing ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync Now
              </>
            )}
          </button>
        </div>

        {/* Stats */}
        {syncStatus && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-stone-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-white">{syncStatus.stats.total}</div>
              <div className="text-stone-400 text-xs">Total Games</div>
            </div>
            <div className="bg-stone-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-amber-400">{syncStatus.stats.active}</div>
              <div className="text-stone-400 text-xs">Active</div>
            </div>
            <div className="bg-stone-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-emerald-400">{syncStatus.stats.scraped}</div>
              <div className="text-stone-400 text-xs">Scraped</div>
            </div>
            <div className="bg-stone-800 rounded-lg p-3">
              <div className="text-xs text-white">
                {syncStatus.lastSync
                  ? new Date(syncStatus.lastSync.syncedAt).toLocaleDateString()
                  : "Never"}
              </div>
              <div className="text-stone-400 text-xs">Last Sync</div>
            </div>
          </div>
        )}

        {/* Settings Grid */}
        <div className="border-t border-stone-800 pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Auto-sync schedule */}
            <div className="flex items-center justify-between gap-3 p-3 bg-stone-800/50 rounded-lg">
              <div>
                <label htmlFor="sync-schedule" className="text-stone-200 text-sm font-medium">
                  Auto-sync
                </label>
                <p className="text-stone-500 text-xs mt-0.5">
                  Schedule automatic syncs
                </p>
              </div>
            <select
              id="sync-schedule"
              value={settings.syncSchedule}
              onChange={async (e) => {
                const newSchedule = e.target.value;
                setSettings({ ...settings, syncSchedule: newSchedule });
                try {
                  await fetch("/api/settings", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ syncSchedule: newSchedule }),
                  });
                } catch (error) {
                  console.error("Failed to save schedule:", error);
                }
              }}
                className="px-3 py-1.5 bg-stone-700 border border-stone-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
            >
                <option value="manual">Off</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

            {/* Auto-scrape new games */}
            <div className="flex items-center justify-between gap-3 p-3 bg-stone-800/50 rounded-lg">
            <div>
                <label htmlFor="auto-scrape" className="text-stone-200 text-sm font-medium">
                Auto-scrape new games
              </label>
              <p className="text-stone-500 text-xs mt-0.5">
                  Fetch details on any sync
              </p>
            </div>
            <button
              id="auto-scrape"
              onClick={async () => {
                const newValue = !settings.autoScrapeNewGames;
                setSettings({ ...settings, autoScrapeNewGames: newValue });
                try {
                  await fetch("/api/settings", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ autoScrapeNewGames: newValue }),
                  });
                } catch (error) {
                  console.error("Failed to save auto-scrape setting:", error);
                }
              }}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settings.autoScrapeNewGames ? "bg-amber-600" : "bg-stone-600"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.autoScrapeNewGames ? "translate-x-5" : ""
                }`}
              />
            </button>
            </div>
          </div>

          {settings.syncSchedule !== "manual" && settings.lastScheduledSync && (
            <p className="text-stone-500 text-xs mt-3">
              Last auto-sync: {new Date(settings.lastScheduledSync).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Unscraped Games Notice */}
      {syncStatus && syncStatus.stats.unscrapedActive > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-amber-300 text-sm font-medium">
                {syncStatus.stats.unscrapedActive} active game{syncStatus.stats.unscrapedActive !== 1 ? "s" : ""} not scraped
              </p>
              <p className="text-amber-400/70 text-xs mt-0.5">
                These games are missing details like images, ratings, and player counts
              </p>
            </div>
          </div>
          <button
            onClick={handleScrapeAll}
            disabled={scrapingAll}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
          >
            {scrapingAll ? "Scraping..." : "Scrape All Active"}
          </button>
        </div>
      )}

      {/* Games List */}
      <div className="bg-stone-900 rounded-xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <h3 className="text-lg font-semibold text-white">Games</h3>
            <div className="flex gap-1 bg-stone-800 rounded-lg p-1">
              {(["all", "active", "scraped"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm transition-colors ${
                    filter === f
                      ? "bg-amber-600 text-white"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <span className="text-stone-500 text-sm">
              {filteredGames.length} games
            </span>
          </div>
          <button
            onClick={handleScrapeAll}
            disabled={scrapingAll || activeCount === 0}
            className="px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-sm"
          >
            {scrapingAll ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="hidden sm:inline">Scraping...</span>
                <span className="sm:hidden">...</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Scrape Active ({activeCount})</span>
                <span className="sm:hidden">Scrape ({activeCount})</span>
              </>
            )}
          </button>
        </div>

        <div className="divide-y divide-stone-800">
          {filteredGames.map((game) => (
            <div
              key={game.id}
              className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-stone-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-stone-800 flex-shrink-0">
                  {(game.selectedThumbnail || game.thumbnail || game.image) ? (
                    <img
                      src={game.selectedThumbnail || game.thumbnail || game.image || ""}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-white truncate text-sm sm:text-base">{game.name}</h4>
                    {game.isExpansion && (
                      <span className="text-[10px] sm:text-xs bg-purple-500/20 text-purple-300 px-1.5 sm:px-2 py-0.5 rounded flex-shrink-0">
                        Exp
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-stone-400 mt-0.5 sm:mt-1">
                    {game.yearPublished && <span>{game.yearPublished}</span>}
                    {game.lastScraped && (
                      <span className="text-emerald-400 hidden sm:inline">
                        Scraped {new Date(game.lastScraped).toLocaleDateString()}
                      </span>
                    )}
                    {game.lastScraped && (
                      <span className="text-emerald-400 sm:hidden">✓</span>
                    )}
                    {game.rating && (
                      <span className="text-amber-400">★ {game.rating.toFixed(1)}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 ml-auto sm:ml-0">
                <button
                  onClick={() => handleToggleActive(game)}
                  className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    game.isActive
                      ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                      : "bg-stone-700 text-stone-400 hover:text-white"
                  }`}
                >
                  {game.isActive ? "Active" : "Off"}
                </button>

                <button
                  onClick={() => handleScrape(game.id)}
                  disabled={scraping === game.id}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {scraping === game.id ? "..." : "Scrape"}
                </button>

                <button
                  onClick={() => setSelectedGame(game)}
                  disabled={!game.lastScraped}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                  title={game.lastScraped ? "Edit images" : "Scrape first to edit images"}
                >
                  <span className="hidden sm:inline">Images</span>
                  <span className="sm:hidden">Img</span>
                </button>
              </div>
            </div>
          ))}

          {filteredGames.length === 0 && (
            <div className="p-12 text-center text-stone-500">
              {games.length === 0
                ? "No games yet. Click Manual Sync to get your collection from BGG."
                : "No games match the current filter."}
            </div>
          )}
        </div>
      </div>

      {/* Image Editor Modal */}
      {selectedGame && (
        <ImageEditor
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onSave={fetchData}
        />
      )}

      {/* Manual Sync Confirmation Dialog */}
      {showSyncDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 rounded-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-stone-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Sync Collection</h2>
                  <p className="text-stone-400 text-sm">Fetch latest collection from BGG</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-stone-300 mb-4">
                This will sync your collection from{" "}
                <span className="text-amber-400 font-medium">{settings.bggUsername}</span> on BoardGameGeek.
              </p>
              <p className="text-stone-400 text-sm mb-4">
                New games will be added and existing games will be updated.
              </p>

              <label className="flex items-center gap-3 p-3 bg-stone-800 rounded-lg cursor-pointer hover:bg-stone-750 transition-colors">
                <input
                  type="checkbox"
                  checked={syncDialogAutoScrape}
                  onChange={(e) => setSyncDialogAutoScrape(e.target.checked)}
                  className="w-5 h-5 rounded border-stone-600 bg-stone-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-stone-900"
                />
                <div>
                  <span className="text-stone-200 text-sm font-medium">Auto-scrape new games</span>
                  <p className="text-stone-500 text-xs mt-0.5">
                    Automatically fetch details and images for newly added games
                  </p>
                </div>
              </label>
            </div>

            <div className="p-6 border-t border-stone-700 flex justify-end gap-3">
              <button
                onClick={() => setShowSyncDialog(false)}
                className="px-4 py-2 text-stone-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSync(!syncDialogAutoScrape)}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors"
              >
                Start Sync
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Username Change Warning Modal */}
      {showUsernameWarning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 rounded-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-stone-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Change BGG Username?</h2>
                  <p className="text-stone-400 text-sm">This action affects your collection</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-stone-300 mb-4">
                You are about to change the BGG username from{" "}
                <span className="text-amber-400 font-medium">{settings.bggUsername}</span> to{" "}
                <span className="text-amber-400 font-medium">{usernameInput}</span>.
              </p>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                <p className="text-red-400 text-sm">
                  <strong>Warning:</strong> Your current collection of{" "}
                  <span className="font-bold">{syncStatus?.stats.total} games</span> will be replaced when you import the new collection.
                </p>
              </div>
              <p className="text-stone-400 text-sm">
                After saving, click &quot;Manual Sync&quot; to load the new collection.
              </p>
            </div>

            <div className="p-6 border-t border-stone-700 flex justify-end gap-3">
              <button
                onClick={() => setShowUsernameWarning(false)}
                className="px-4 py-2 text-stone-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveUsername}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors"
              >
                Yes, Change Username
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
