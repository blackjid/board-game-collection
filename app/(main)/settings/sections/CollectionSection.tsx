"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Square,
  Loader2,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

  // Queue status
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [syncRes, settingsRes] = await Promise.all([
        fetch("/api/collection/import"),
        fetch("/api/settings"),
      ]);
      const [syncData, settingsData] = await Promise.all([
        syncRes.json(),
        settingsRes.json(),
      ]);
      setSyncStatus(syncData);
      setSettings(settingsData);
      setUsernameInput(settingsData.bggUsername || "");
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

      // If queue is processing, also refresh sync data
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

  const handleScrapeAll = async () => {
    try {
      await fetch("/api/games/scrape-active", { method: "POST" });
      await fetchQueueStatus();
    } catch (error) {
      console.error("Failed to start scraping:", error);
    }
  };

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
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Collection Sync</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configure BoardGameGeek sync settings. Manage games in the{" "}
          <Link href="/" className="text-primary hover:underline">
            main collection view
          </Link>
          .
        </p>
      </div>

      {/* Collection Source & Sync */}
      <Card className="gap-0">
        <CardHeader className="border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">BoardGameGeek</CardTitle>
              <CardDescription>Import and sync your collection</CardDescription>
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
        <CardContent className="pt-6 space-y-6">
          {/* Username input */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-md">
            <div className="flex-1 space-y-2">
              <Label htmlFor="bgg-username">Username</Label>
              <Input
                id="bgg-username"
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Your BGG username"
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

          {/* Link to manage games */}
          {syncStatus && syncStatus.stats.total > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/" className="gap-2">
                  <ExternalLink className="size-4" />
                  Manage Games in Collection
                </Link>
              </Button>
            </div>
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
              size="sm"
            >
              Scrape All Visible
            </Button>
          </CardContent>
        </Card>
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
