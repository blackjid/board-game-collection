"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Square,
  ImageIcon,
  Loader2,
  ChevronDown,
  MoreVertical,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRowSelection } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";

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

interface ScrapeJob {
  id: string;
  gameId: string;
  gameName: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  error?: string;
}

interface QueueStatus {
  isProcessing: boolean;
  isStopping: boolean;
  currentJob: ScrapeJob | null;
  pendingCount: number;
  completedCount: number;
  failedCount: number;
  cancelledCount: number;
  recentJobs: ScrapeJob[];
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
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{game.name}</DialogTitle>
          <DialogDescription>
            Select thumbnail and component images
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {allImages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No images available. Scrape this game first to fetch images.</p>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-3">
                  Thumbnail
                  <span className="text-muted-foreground font-normal ml-2 text-sm">
                    (Click to select)
                  </span>
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => handleThumbnailSelect(img)}
                      className={cn(
                        "aspect-square rounded-lg overflow-hidden border-2 transition-all relative",
                        selectedThumbnail === img
                          ? "border-primary ring-2 ring-primary/50"
                          : img === game.image && !selectedThumbnail
                          ? "border-blue-500/50"
                          : "border-border hover:border-muted-foreground"
                      )}
                    >
                      <Image src={img} alt="" fill sizes="100px" className="object-cover" />
                      {selectedThumbnail === img && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Badge>THUMB</Badge>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-foreground mb-3">
                  Component Images
                  <span className="text-muted-foreground font-normal ml-2 text-sm">
                    (Click to toggle)
                  </span>
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => handleComponentToggle(img)}
                      className={cn(
                        "aspect-square rounded-lg overflow-hidden border-2 transition-all relative",
                        componentImages.includes(img)
                          ? "border-emerald-500 ring-2 ring-emerald-500/50"
                          : "border-border hover:border-muted-foreground"
                      )}
                    >
                      <Image src={img} alt="" fill sizes="100px" className="object-cover" />
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

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

  // Queue status
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);

  // Row selection for bulk actions
  const filteredGames = games.filter((game) => {
    if (filter === "active") return game.isActive;
    if (filter === "scraped") return game.lastScraped !== null;
    return true;
  });

  const {
    selectedIds,
    selectedItems,
    selectedCount,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    allSelected,
    someSelected,
  } = useRowSelection({
    items: filteredGames,
    getItemId: (game) => game.id,
  });

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

  const fetchQueueStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/scrape-status");
      const data = await res.json();
      setQueueStatus(data);

      // If queue is processing, also refresh game data
      if (data.isProcessing) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to fetch queue status:", error);
    }
  }, [fetchData]);

  useEffect(() => {
    fetchData();
    fetchQueueStatus();
  }, [fetchData, fetchQueueStatus]);

  // Poll queue status while processing
  useEffect(() => {
    if (!queueStatus?.isProcessing && queueStatus?.pendingCount === 0) {
      return;
    }

    const interval = setInterval(fetchQueueStatus, 2000);
    return () => clearInterval(interval);
  }, [queueStatus?.isProcessing, queueStatus?.pendingCount, fetchQueueStatus]);

  const handleSyncClick = () => {
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
      await fetchQueueStatus();
    } finally {
      setScraping(null);
    }
  };

  const handleScrapeAll = async () => {
    setScrapingAll(true);
    try {
      await fetch("/api/games/scrape-active", { method: "POST" });
      await fetchQueueStatus();
    } finally {
      setScrapingAll(false);
    }
  };

  // Bulk actions
  const handleBulkActivate = async () => {
    await Promise.all(
      selectedItems.filter((g) => !g.isActive).map((game) =>
        fetch(`/api/games/${game.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: true }),
        })
      )
    );
    clearSelection();
    await fetchData();
  };

  const handleBulkDeactivate = async () => {
    await Promise.all(
      selectedItems.filter((g) => g.isActive).map((game) =>
        fetch(`/api/games/${game.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        })
      )
    );
    clearSelection();
    await fetchData();
  };

  const handleBulkScrape = async () => {
    for (const game of selectedItems) {
      await fetch(`/api/games/${game.id}/scrape`, { method: "POST" });
    }
    clearSelection();
    await fetchQueueStatus();
  };

  const activeCount = games.filter((g) => g.isActive).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading collection data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Collection</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your BoardGameGeek collection and games
        </p>
      </div>

      {/* Collection Source & Sync */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <CardTitle>BGG Source</CardTitle>
              <CardDescription>Connect your BoardGameGeek collection</CardDescription>
            </div>
            <Button
              onClick={handleSyncClick}
              disabled={syncing || !settings.bggUsername}
            >
              {syncing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  Sync Now
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Username input */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-md">
            <div className="flex-1 space-y-2">
              <Label htmlFor="bgg-username">BGG Username</Label>
              <Input
                id="bgg-username"
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="BGG username"
              />
            </div>
            <Button
              variant="secondary"
              onClick={handleUsernameChange}
              disabled={saving || usernameInput === (settings.bggUsername || "")}
              className="self-end"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
          {settings.bggUsername && usernameInput !== settings.bggUsername && usernameInput && (
            <p className="text-amber-500 text-xs flex items-center gap-1">
              <AlertTriangle className="size-3" />
              Changing username will clear current collection
            </p>
          )}

          {/* Stats */}
          {syncStatus && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-muted rounded-lg p-3">
                <div className="text-2xl font-bold text-foreground">{syncStatus.stats.total}</div>
                <div className="text-muted-foreground text-xs">Total Games</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-2xl font-bold text-primary">{syncStatus.stats.active}</div>
                <div className="text-muted-foreground text-xs">Visible</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-2xl font-bold text-emerald-400">{syncStatus.stats.scraped}</div>
                <div className="text-muted-foreground text-xs">Scraped</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-2xl font-bold text-foreground">
                  {syncStatus.lastSync
                    ? new Date(syncStatus.lastSync.syncedAt).toLocaleDateString()
                    : "Never"}
                </div>
                <div className="text-muted-foreground text-xs">Last Sync</div>
              </div>
            </div>
          )}

          {/* Settings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Auto-sync schedule */}
            <div className="flex items-center justify-between gap-3 p-3 bg-muted/40 rounded-lg">
              <div>
                <Label htmlFor="sync-schedule" className="text-sm font-medium text-foreground">
                  Auto-sync
                </Label>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Schedule automatic syncs
                </p>
              </div>
              <Select
                value={settings.syncSchedule}
                onValueChange={async (value) => {
                  setSettings({ ...settings, syncSchedule: value });
                  try {
                    await fetch("/api/settings", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ syncSchedule: value }),
                    });
                  } catch (error) {
                    console.error("Failed to save schedule:", error);
                  }
                }}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Off</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Auto-scrape new games */}
            <div className="flex items-center justify-between gap-3 p-3 bg-muted/40 rounded-lg">
              <div>
                <Label htmlFor="auto-scrape" className="text-sm font-medium">
                  Auto-scrape new games
                </Label>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Fetch details on any sync
                </p>
              </div>
              <Switch
                id="auto-scrape"
                checked={settings.autoScrapeNewGames}
                onCheckedChange={async (checked) => {
                  setSettings({ ...settings, autoScrapeNewGames: checked });
                  try {
                    await fetch("/api/settings", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ autoScrapeNewGames: checked }),
                    });
                  } catch (error) {
                    console.error("Failed to save auto-scrape setting:", error);
                  }
                }}
              />
            </div>
          </div>

          {settings.syncSchedule !== "manual" && settings.lastScheduledSync && (
            <p className="text-muted-foreground text-xs">
              Last auto-sync: {new Date(settings.lastScheduledSync).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Scrape Queue Status */}
      {queueStatus && (queueStatus.isProcessing || queueStatus.pendingCount > 0) && (
        <Card className={cn(
          "border",
          queueStatus.isStopping
            ? "bg-amber-500/10 border-amber-500/30"
            : "bg-emerald-500/10 border-emerald-500/30"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "size-3 rounded-full animate-pulse",
                  queueStatus.isStopping ? "bg-amber-500" : "bg-emerald-500"
                )} />
                <h3 className={cn(
                  "font-medium",
                  queueStatus.isStopping ? "text-amber-300" : "text-emerald-300"
                )}>
                  {queueStatus.isStopping ? "Stopping..." : "Scraping in Progress"}
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await fetch("/api/scrape-status", { method: "POST" });
                    await fetchQueueStatus();
                  } catch (error) {
                    console.error("Failed to cancel:", error);
                  }
                }}
                disabled={queueStatus.isStopping}
              >
                <Square className="size-3" />
                {queueStatus.isStopping ? "Stopping..." : "Stop"}
              </Button>
            </div>

            {queueStatus.currentJob && (
              <div className="bg-card/50 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 text-emerald-400 animate-spin" />
                  <span className="text-foreground text-sm font-medium">
                    {queueStatus.currentJob.gameName}
                  </span>
                  {queueStatus.isStopping && (
                    <span className="text-amber-400 text-xs">(will stop after this)</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {queueStatus.pendingCount} pending
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="size-3 text-emerald-500" />
                {queueStatus.completedCount} completed
              </span>
              {queueStatus.failedCount > 0 && (
                <span className="flex items-center gap-1">
                  <XCircle className="size-3 text-red-500" />
                  {queueStatus.failedCount} failed
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unscraped Games Notice */}
      {syncStatus && syncStatus.stats.unscrapedActive > 0 && !queueStatus?.isProcessing && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-300 text-sm font-medium">
                  {syncStatus.stats.unscrapedActive} visible game{syncStatus.stats.unscrapedActive !== 1 ? "s" : ""} not scraped
                </p>
                <p className="text-amber-400/70 text-xs mt-0.5">
                  These games are missing details like images, ratings, and player counts
                </p>
              </div>
            </div>
            <Button
              onClick={handleScrapeAll}
              disabled={scrapingAll}
              size="sm"
            >
              {scrapingAll ? "Queuing..." : "Scrape All Visible"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Games List */}
      <Card className="gap-0">
        <CardHeader className="border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">Games</CardTitle>
              <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs px-2.5">All</TabsTrigger>
                  <TabsTrigger value="active" className="text-xs px-2.5">Visible</TabsTrigger>
                  <TabsTrigger value="scraped" className="text-xs px-2.5">Scraped</TabsTrigger>
                </TabsList>
              </Tabs>
              <span className="text-muted-foreground text-sm hidden sm:inline">
                {filteredGames.length} games
              </span>
            </div>
            <Button
              onClick={handleScrapeAll}
              disabled={scrapingAll || activeCount === 0}
              size="sm"
              variant="secondary"
            >
              {scrapingAll ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Play className="size-4" />
                    Scrape Visible ({activeCount})
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Select All Header with Bulk Actions */}
          <div className={cn(
            "px-3 sm:px-4 h-12 border-b border-border flex items-center gap-3 sm:gap-4",
            selectedCount > 0 ? "bg-primary/10" : "bg-muted/30"
          )}>
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAll}
              aria-label="Select all"
              {...(someSelected ? { "data-state": "indeterminate" } : {})}
            />
            <span className="text-xs text-muted-foreground flex-1">
              {selectedCount > 0
                ? `${selectedCount} game${selectedCount !== 1 ? "s" : ""} selected`
                : allSelected ? "Deselect all" : "Select all"}
            </span>
            {selectedCount > 0 && (
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Actions
                      <ChevronDown className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleBulkActivate}>
                      <Eye className="size-4" />
                      Show Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBulkDeactivate}>
                      <EyeOff className="size-4" />
                      Hide Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBulkScrape}>
                      <RefreshCw className="size-4" />
                      Scrape Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            )}
          </div>

          <div className="divide-y divide-border">
            {filteredGames.map((game) => {
              const isInQueue = queueStatus?.recentJobs.some(
                (j) => j.gameId === game.id && (j.status === "pending" || j.status === "processing")
              );
              const isCurrentlyProcessing = queueStatus?.currentJob?.gameId === game.id;
              const isPending = queueStatus?.recentJobs.some(
                (j) => j.gameId === game.id && j.status === "pending"
              );

              const GameActions = ({ asContext = false }: { asContext?: boolean }) => {
                const MenuItem = asContext ? ContextMenuItem : DropdownMenuItem;
                const MenuSeparator = asContext ? ContextMenuSeparator : DropdownMenuSeparator;

                return (
                  <>
                    <MenuItem
                      onClick={() => handleToggleActive(game)}
                      className="gap-2"
                    >
                      {game.isActive ? (
                        <>
                          <EyeOff className="size-4" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="size-4" />
                          Show
                        </>
                      )}
                    </MenuItem>

                    <MenuItem
                      onClick={() => handleScrape(game.id)}
                      disabled={scraping === game.id || isInQueue}
                      className="gap-2"
                    >
                      <RefreshCw className={cn("size-4", isCurrentlyProcessing && "animate-spin")} />
                      {scraping === game.id || isCurrentlyProcessing
                        ? "Scraping..."
                        : isPending
                        ? "Queued"
                        : "Scrape Details"}
                    </MenuItem>

                    <MenuItem
                      onClick={() => setSelectedGame(game)}
                      disabled={!game.lastScraped}
                      className="gap-2"
                    >
                      <ImageIcon className="size-4" />
                      Edit Images
                    </MenuItem>

                    <MenuSeparator />

                    <MenuItem
                      onClick={() => window.open(`https://boardgamegeek.com/boardgame/${game.id}`, "_blank")}
                      className="gap-2"
                    >
                      <ExternalLink className="size-4" />
                      View on BGG
                    </MenuItem>
                  </>
                );
              };

              return (
                <ContextMenu key={game.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      className={cn(
                        "p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:bg-muted/50 transition-colors cursor-default",
                        isSelected(game.id) && "bg-primary/5"
                      )}
                    >
                      <Checkbox
                        checked={isSelected(game.id)}
                        onCheckedChange={() => toggleItem(game.id)}
                        aria-label={`Select ${game.name}`}
                      />

                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
                        {game.selectedThumbnail || game.thumbnail || game.image ? (
                          <Image
                            src={game.selectedThumbnail || game.thumbnail || game.image || ""}
                            alt=""
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="size-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground truncate text-sm sm:text-base">
                            {game.name}
                          </h4>
                          {game.isExpansion && (
                            <Badge variant="secondary" className="text-[10px] sm:text-xs">
                              Exp
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                          {game.yearPublished && <span>{game.yearPublished}</span>}
                          {game.lastScraped && (
                            <span className="text-muted-foreground hidden sm:inline">
                              Scraped {new Date(game.lastScraped).toLocaleDateString()}
                            </span>
                          )}
                          {game.lastScraped && (
                            <CheckCircle className="size-3 text-emerald-400 sm:hidden" />
                          )}
                          {game.rating && (
                            <span className="text-primary">★ {game.rating.toFixed(1)}</span>
                          )}
                        </div>
                      </div>

                      {/* Status indicators and actions */}
                      <div className="flex items-center gap-2">
                        {/* Status badge */}
                        <Badge
                          variant={game.isActive ? "default" : "secondary"}
                          className={cn(
                            "text-xs hidden sm:flex",
                            game.isActive && "bg-primary/20 text-primary hover:bg-primary/30"
                          )}
                        >
                          {game.isActive ? "Visible" : "Hidden"}
                        </Badge>

                        {/* Mobile status dot */}
                        <div
                          className={cn(
                            "size-2 rounded-full sm:hidden",
                            game.isActive ? "bg-primary" : "bg-muted-foreground"
                          )}
                          title={game.isActive ? "Visible" : "Hidden"}
                        />

                        {/* Dropdown menu trigger */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="size-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <GameActions />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-48">
                    <GameActions asContext />
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}

            {filteredGames.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                {games.length === 0
                  ? "No games yet. Click Sync Now to get your collection from BGG."
                  : "No games match the current filter."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Image Editor Modal */}
      {selectedGame && (
        <ImageEditor
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onSave={fetchData}
        />
      )}

      {/* Manual Sync Confirmation Dialog */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center">
                <RefreshCw className="size-6 text-primary" />
              </div>
              Sync Collection
            </DialogTitle>
            <DialogDescription>
              Fetch latest collection from BGG
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-muted-foreground">
              This will sync your collection from{" "}
              <span className="text-primary font-medium">{settings.bggUsername}</span> on BoardGameGeek.
            </p>
            <p className="text-muted-foreground text-sm">
              New games will be added and existing games will be updated.
            </p>

            <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors">
              <Checkbox
                checked={syncDialogAutoScrape}
                onCheckedChange={(checked) => setSyncDialogAutoScrape(checked === true)}
              />
              <div>
                <span className="text-foreground text-sm font-medium">Auto-scrape new games</span>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Automatically fetch details and images for newly added games
                </p>
              </div>
            </label>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSyncDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleSync(!syncDialogAutoScrape)}>
              Start Sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Username Change Warning Modal */}
      <Dialog open={showUsernameWarning} onOpenChange={setShowUsernameWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="size-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="size-6 text-amber-500" />
              </div>
              Change BGG Username?
            </DialogTitle>
            <DialogDescription>
              This action affects your collection
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-muted-foreground">
              You are about to change the BGG username from{" "}
              <span className="text-primary font-medium">{settings.bggUsername}</span> to{" "}
              <span className="text-primary font-medium">{usernameInput}</span>.
            </p>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm">
                <strong>Warning:</strong> Your current collection of{" "}
                <span className="font-bold">{syncStatus?.stats.total} games</span> will be replaced when you import the new collection.
              </p>
            </div>
            <p className="text-muted-foreground text-sm">
              After saving, click &quot;Sync Now&quot; to load the new collection.
            </p>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUsernameWarning(false)}>
              Cancel
            </Button>
            <Button onClick={saveUsername}>
              Yes, Change Username
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
