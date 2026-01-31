"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Play,
  Search,
  X,
  LayoutGrid,
  List,
  Table2,
  Settings as SettingsIcon,
  LogIn,
  Printer,
  ExternalLink,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  FolderPlus,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  Square,
  Share2,
  Layers,
  Puzzle,
  AlertTriangle,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { SiteHeader } from "@/components/SiteHeader";
import { GameCard } from "@/components/GameCard";
import { GameRowItem } from "@/components/GameRowItem";
import { GameTable, SortField, SortDirection } from "@/components/GameTable";
import { EditListDialog, DeleteListDialog, DuplicateListDialog, ShareListDialog } from "@/components/ListDialogs";
import { AddGamesToListDialog } from "@/components/AddGamesToListDialog";
import { EditContributorDialog } from "@/components/EditContributorDialog";
import { BulkEditContributorDialog } from "@/components/BulkEditContributorDialog";
import type { Contributor } from "@/components/ContributorSelector";
import type { GameData, GameGroup } from "@/lib/games";
import { groupGamesByBaseGame } from "@/lib/games";
import { saveUIPreference } from "@/lib/cookies";

type SortOption = "default" | "name" | "year" | "rating";
type ViewMode = "card" | "list" | "table";

interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface SelectedCollection {
  id: string;
  name: string;
  slug?: string | null;
  description: string | null;
  type: string;
  isPrimary: boolean;
  isPublic?: boolean;
  shareToken?: string | null;
  bggUsername: string | null;
  gameCount: number;
}

interface CollectionSummary {
  id: string;
  name: string;
  type: string;
  gameCount: number;
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

interface HomeClientProps {
  games: GameData[];
  totalGames: number;
  collectionName: string | null;
  bggUsername: string | null;
  lastSyncedAt: string | null;
  currentUser: CurrentUser | null;
  selectedCollection: SelectedCollection | null;
  initialViewMode?: "card" | "list" | "table";
  initialCardSize?: number;
  isSharedView?: boolean;
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

// ============================================================================
// Image Editor Dialog
// ============================================================================

interface ImageEditorProps {
  game: GameData;
  onClose: () => void;
  onSave: () => void;
}

function ImageEditor({ game, onClose, onSave }: ImageEditorProps) {
  const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(
    game.selectedThumbnail
  );
  const [saving, setSaving] = useState(false);

  // Cover images for thumbnail selection (from versions=1 / official box art)
  const coverImages = [
    ...(game.image ? [game.image] : []),
    ...game.availableImages,
  ].filter((img, index, self) => self.indexOf(img) === index);

  const handleThumbnailSelect = (url: string) => {
    setSelectedThumbnail(url === selectedThumbnail ? null : url);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/games/${game.id}/preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedThumbnail }),
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
          {coverImages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No images available. Scrape this game first to fetch images.</p>
            </div>
          ) : (
            <div>
              <h3 className="text-base font-semibold text-foreground mb-3">
                Cover Images
                <span className="text-muted-foreground font-normal ml-2 text-sm">
                  (Select as thumbnail)
                </span>
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {coverImages.map((img, i) => (
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

// ============================================================================
// Main Component
// ============================================================================

export function HomeClient({
  games,
  totalGames,
  collectionName,
  bggUsername,
  lastSyncedAt,
  currentUser,
  selectedCollection,
  initialViewMode = "card",
  initialCardSize = 6,
  isSharedView = false,
}: HomeClientProps) {
  const router = useRouter();

  // UI preferences - initialize from server-provided values (no flash!)
  const [columns, setColumns] = useState(initialCardSize);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  // For automatic lists, default to "default" to preserve server-provided order (e.g., play count)
  const isAutomaticList = selectedCollection?.type === "automatic";
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [searchQuery, setSearchQuery] = useState("");

  // Grouped view state - shows expansions nested under base games
  const [isGroupedView, setIsGroupedView] = useState(false);

  // Set default sort for automatic lists on mount
  useEffect(() => {
    if (isAutomaticList) {
      setSortBy("default");
    }
  }, [isAutomaticList]);
  const [syncing, setSyncing] = useState(false);

  // Table sorting state
  const [tableSortField, setTableSortField] = useState<SortField>("name");
  const [tableSortDirection, setTableSortDirection] = useState<SortDirection>("asc");

  // Admin list management state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showAddGamesDialog, setShowAddGamesDialog] = useState(false);
  const [gameForContributorEdit, setGameForContributorEdit] = useState<GameData | null>(null);
  const [showBulkContributorDialog, setShowBulkContributorDialog] = useState(false);

  // Bulk selection state
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
  const [removingGames, setRemovingGames] = useState(false);


  // Admin game management state
  const [scrapingIds, setScrapingIds] = useState<Set<string>>(new Set());
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [selectedGameForImages, setSelectedGameForImages] = useState<GameData | null>(null);

  // Collections for "Add to List" feature
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [showAddToListDialog, setShowAddToListDialog] = useState(false);
  const [gameIdsToAddToList, setGameIdsToAddToList] = useState<string[]>([]);
  const [addingToList, setAddingToList] = useState(false);

  const isAdmin = currentUser?.role === "admin";
  const isViewingList = selectedCollection && !selectedCollection.isPrimary && selectedCollection.type === "manual";

  // Manual collections only (for add to list)
  const manualCollections = collections.filter((c) => c.type === "manual");
  const hasManualLists = manualCollections.length > 0;

  // Determine the display title based on whether a collection is selected
  const displayTitle = selectedCollection
    ? selectedCollection.name
    : collectionName || (bggUsername ? `${bggUsername}'s` : "Board Game");

  const displayGameCount = selectedCollection ? games.length : totalGames;

  // Get the link for "Pick a Game" - use slug-based URL for lists
  const pickGameHref = selectedCollection?.slug
    ? `/pick/lists/${selectedCollection.slug}`
    : "/pick";

  // Set of existing game IDs in this list (for AddGamesToListDialog)
  const existingGameIds = useMemo(
    () => new Set(games.map((g) => g.id)),
    [games]
  );

  // Build breadcrumbs
  const breadcrumbs = selectedCollection
    ? [{ label: selectedCollection.name }]
    : [{ label: `${displayTitle} Collection` }];

  // Queued game IDs
  const queuedIds = useMemo(() => {
    if (!queueStatus) return new Set<string>();
    return new Set(
      queueStatus.recentJobs
        .filter((j) => j.status === "pending" || j.status === "processing")
        .map((j) => j.gameId)
    );
  }, [queueStatus]);

  // Fetch collections for "Add to List" feature
  useEffect(() => {
    if (isAdmin) {
      fetch("/api/collections")
        .then((res) => res.json())
        .then((data) => setCollections(data.collections || []))
        .catch(console.error);
    }
  }, [isAdmin]);

  // Fetch queue status
  const fetchQueueStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/scrape-status");
      const data = await res.json();
      setQueueStatus(data);
    } catch (error) {
      console.error("Failed to fetch queue status:", error);
    }
  }, []);

  // Poll queue status while processing
  useEffect(() => {
    if (!isAdmin) return;

    fetchQueueStatus();

    if (!queueStatus?.isProcessing && queueStatus?.pendingCount === 0) {
      return;
    }

    const interval = setInterval(fetchQueueStatus, 2000);
    return () => clearInterval(interval);
  }, [isAdmin, queueStatus?.isProcessing, queueStatus?.pendingCount, fetchQueueStatus]);

  // Persist UI preferences to cookies when they change
  useEffect(() => {
    saveUIPreference("viewMode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    saveUIPreference("cardSize", columns);
  }, [columns]);

  const filteredAndSortedGames = useMemo(() => {
    let result = [...games];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(game =>
        game.name.toLowerCase().includes(query)
      );
    }

    // Sort based on view mode
    if (viewMode === "table") {
      return result.sort((a, b) => {
        const dir = tableSortDirection === "asc" ? 1 : -1;
        switch (tableSortField) {
          case "name":
            return a.name.localeCompare(b.name) * dir;
          case "year":
            if (a.yearPublished === null) return 1;
            if (b.yearPublished === null) return -1;
            return (a.yearPublished - b.yearPublished) * dir;
          case "rating":
            if (a.rating === null) return 1;
            if (b.rating === null) return -1;
            return (a.rating - b.rating) * dir;
          case "players":
            if (a.maxPlayers === null) return 1;
            if (b.maxPlayers === null) return -1;
            return (a.maxPlayers - b.maxPlayers) * dir;
          case "playtime":
            if (a.maxPlaytime === null) return 1;
            if (b.maxPlaytime === null) return -1;
            return (a.maxPlaytime - b.maxPlaytime) * dir;
          case "weight":
            if (a.weight === null) return 1;
            if (b.weight === null) return -1;
            return (a.weight - b.weight) * dir;
          case "rank":
            if (a.bggRank === null) return 1;
            if (b.bggRank === null) return -1;
            return (a.bggRank - b.bggRank) * dir;
          case "contributor":
            const aContrib = a.contributor?.displayName || "";
            const bContrib = b.contributor?.displayName || "";
            return aContrib.localeCompare(bContrib) * dir;
          case "inCollection":
            const aInColl = a.isInPrimaryCollection ? 1 : 0;
            const bInColl = b.isInPrimaryCollection ? 1 : 0;
            return (aInColl - bInColl) * dir;
          default:
            return 0;
        }
      });
    }

    // Standard sort for card/list views
    // "default" preserves the original order from the server (important for automatic lists)
    if (sortBy === "default") {
      return result;
    }

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
  }, [games, sortBy, searchQuery, viewMode, tableSortField, tableSortDirection]);

  // Group games by base game for grouped view
  const groupedGames = useMemo((): GameGroup[] => {
    if (!isGroupedView) return [];
    return groupGamesByBaseGame(filteredAndSortedGames);
  }, [filteredAndSortedGames, isGroupedView]);

  // ============================================================================
  // Handlers
  // ============================================================================

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

  const handleTableSort = (field: SortField) => {
    if (tableSortField === field) {
      setTableSortDirection(tableSortDirection === "asc" ? "desc" : "asc");
    } else {
      setTableSortField(field);
      setTableSortDirection("asc");
    }
  };

  // Bulk selection handlers
  const toggleGameSelection = useCallback((gameId: string) => {
    setSelectedGameIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  }, []);

  const toggleAllGames = useCallback(() => {
    if (selectedGameIds.size === filteredAndSortedGames.length) {
      setSelectedGameIds(new Set());
    } else {
      setSelectedGameIds(new Set(filteredAndSortedGames.map((g) => g.id)));
    }
  }, [filteredAndSortedGames, selectedGameIds.size]);

  const clearSelection = useCallback(() => {
    setSelectedGameIds(new Set());
  }, []);

  // Remove selected games from list
  const handleRemoveSelected = async () => {
    if (!selectedCollection || selectedGameIds.size === 0) return;
    setRemovingGames(true);

    try {
      const promises = Array.from(selectedGameIds).map((gameId) =>
        fetch(`/api/collections/${selectedCollection.id}/games`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId }),
        })
      );
      await Promise.all(promises);
      setSelectedGameIds(new Set());
      router.refresh();
    } catch (error) {
      console.error("Failed to remove games:", error);
    } finally {
      setRemovingGames(false);
    }
  };

  // Remove single game from list
  const handleRemoveFromList = async (gameId: string) => {
    if (!selectedCollection) return;
    try {
      await fetch(`/api/collections/${selectedCollection.id}/games`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to remove game:", error);
    }
  };

  // Update contributor for a game in a list
  const handleUpdateContributor = async (contributor: Contributor | null) => {
    if (!selectedCollection || !gameForContributorEdit) return;
    await fetch(`/api/collections/${selectedCollection.id}/games`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId: gameForContributorEdit.id,
        contributorId: contributor?.id ?? null,
      }),
    });
    router.refresh();
  };

  // Update contributors for multiple selected games
  const handleBulkUpdateContributor = async (contributor: Contributor | null) => {
    if (!selectedCollection || selectedGameIds.size === 0) return;

    const promises = Array.from(selectedGameIds).map((gameId) =>
      fetch(`/api/collections/${selectedCollection.id}/games`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          contributorId: contributor?.id ?? null,
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to update contributor for game ${gameId}`);
        }
        return res;
      })
    );
    
    await Promise.all(promises);
    setSelectedGameIds(new Set());
    router.refresh();
  };


  // Admin game management handlers
  const handleToggleVisibility = async (game: GameData) => {
    const isVisible = game.collections && game.collections.length > 0;

    if (isVisible && selectedCollection) {
      // Remove from current collection
      await fetch(`/api/collections/${selectedCollection.id}/games`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: game.id }),
      });
    } else {
      // Add to primary collection if not visible
      const primaryCollection = collections.find((c) => c.type === "bgg_sync");
      if (primaryCollection) {
        await fetch(`/api/collections/${primaryCollection.id}/games`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: game.id }),
        });
      }
    }
    router.refresh();
  };

  const handleScrape = async (gameId: string) => {
    setScrapingIds((prev) => new Set(prev).add(gameId));
    try {
      await fetch(`/api/games/${gameId}/scrape`, { method: "POST" });
      await fetchQueueStatus();
    } finally {
      setScrapingIds((prev) => {
        const next = new Set(prev);
        next.delete(gameId);
        return next;
      });
    }
  };

  const handleBulkScrape = async () => {
    for (const gameId of selectedGameIds) {
      await fetch(`/api/games/${gameId}/scrape`, { method: "POST" });
    }
    clearSelection();
    await fetchQueueStatus();
  };

  const handleStopQueue = async () => {
    try {
      await fetch("/api/scrape-status", { method: "POST" });
      await fetchQueueStatus();
    } catch (error) {
      console.error("Failed to stop queue:", error);
    }
  };

  // Add to list handlers
  const openAddToListDialog = (gameIds: string[]) => {
    setGameIdsToAddToList(gameIds);
    setShowAddToListDialog(true);
  };

  const handleDialogAddToList = async (collectionId: string) => {
    setAddingToList(true);
    try {
      await Promise.all(
        gameIdsToAddToList.map((gameId) =>
          fetch(`/api/collections/${collectionId}/games`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameId }),
          })
        )
      );
      if (gameIdsToAddToList.length > 1) {
        clearSelection();
      }
      setShowAddToListDialog(false);
      setGameIdsToAddToList([]);
      // Refresh collections
      const collectionsRes = await fetch("/api/collections");
      const collectionsData = await collectionsRes.json();
      setCollections(collectionsData.collections || []);
    } catch (error) {
      console.error("Failed to add games to list:", error);
    } finally {
      setAddingToList(false);
    }
  };

  // Selection state derived values
  const allSelected = selectedGameIds.size === filteredAndSortedGames.length && filteredAndSortedGames.length > 0;
  const someSelected = selectedGameIds.size > 0;

  // Header actions
  const headerActions = isSharedView ? (
    // Shared view: only show login button
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm" className="gap-2">
        <Link href="/login">
          <LogIn className="size-4" />
          <span className="hidden sm:inline">Sign In</span>
        </Link>
      </Button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      {/* Add Games Button - Admin only when viewing a list */}
      {isAdmin && isViewingList && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddGamesDialog(true)}
          className="gap-2"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Games</span>
        </Button>
      )}

      {/* Quick Sync - Admin only, not shown when viewing a collection */}
      {isAdmin && !selectedCollection && (
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
        <Link href={pickGameHref}>
          <Play className="size-4" />
          <span className="hidden sm:inline">Pick a Game</span>
        </Link>
      </Button>

      {/* List Actions Menu - Admin only when viewing a list */}
      {isAdmin && isViewingList && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9">
              <MoreVertical className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
              <Pencil className="size-4" />
              Edit List
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
              <Share2 className="size-4" />
              Share List
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowDuplicateDialog(true)}>
              <FolderPlus className="size-4" />
              Duplicate List
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" />
              Delete List
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  return (
    <div className="flex-1 min-w-0 min-h-screen bg-background print:bg-white">
      {/* Site Header with breadcrumbs */}
      <SiteHeader
        breadcrumbs={breadcrumbs}
        actions={headerActions}
        showSidebarTrigger={!isSharedView}
      />

      {/* Scrape Queue Status Banner */}
      {isAdmin && queueStatus && (queueStatus.isProcessing || queueStatus.pendingCount > 0) && (
        <div className={cn(
          "border-b px-4 sm:px-6 py-3",
          queueStatus.isStopping
            ? "bg-amber-500/10 border-amber-500/30"
            : "bg-emerald-500/10 border-emerald-500/30"
        )}>
          <div className="max-w-7xl mx-auto lg:mx-0 lg:max-w-none flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "size-2.5 rounded-full animate-pulse",
                queueStatus.isStopping ? "bg-amber-500" : "bg-emerald-500"
              )} />
              <span className={cn(
                "text-sm font-medium",
                queueStatus.isStopping ? "text-amber-300" : "text-emerald-300"
              )}>
                {queueStatus.isStopping ? "Stopping..." : "Scraping"}
                {queueStatus.currentJob && (
                  <span className="text-muted-foreground ml-2">
                    {queueStatus.currentJob.gameName}
                  </span>
                )}
              </span>
              {/* Show batch-specific stats if available, otherwise global stats */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {queueStatus.currentBatch ? (
                  <>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="size-3 text-emerald-500" />
                      {queueStatus.currentBatch.completed}/{queueStatus.currentBatch.total}
                    </span>
                    {queueStatus.currentBatch.pending > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {queueStatus.currentBatch.pending} pending
                      </span>
                    )}
                    {queueStatus.currentBatch.failed > 0 && (
                      <span className="flex items-center gap-1">
                        <XCircle className="size-3 text-red-500" />
                        {queueStatus.currentBatch.failed} failed
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {queueStatus.pendingCount} pending
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="size-3 text-emerald-500" />
                      {queueStatus.completedCount}
                    </span>
                    {queueStatus.failedCount > 0 && (
                      <span className="flex items-center gap-1">
                        <XCircle className="size-3 text-red-500" />
                        {queueStatus.failedCount}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStopQueue}
              disabled={queueStatus.isStopping}
            >
              <Square className="size-3" />
              Stop
            </Button>
          </div>
        </div>
      )}

      {/* Content Header - Meta info and search */}
      <div className="bg-gradient-to-b from-card to-card/95 border-b border-border print:hidden px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto lg:mx-0 lg:max-w-none">
          {/* Meta info and search on same row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Meta info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {displayGameCount} game{displayGameCount !== 1 ? "s" : ""}
              </span>
              {!selectedCollection && lastSyncedAt && isAdmin && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span>Synced {formatRelativeTime(lastSyncedAt)}</span>
                </>
              )}
              {selectedCollection?.description && (
                <>
                  <span className="text-muted-foreground/50 hidden sm:inline">•</span>
                  <span className="hidden sm:inline truncate max-w-[200px]">
                    {selectedCollection.description}
                  </span>
                </>
              )}
            </div>

            {/* Search bar */}
            {games.length > 0 && (
              <div className="relative w-full sm:w-auto sm:min-w-[280px] sm:max-w-md">
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
            )}
          </div>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:flex print:mb-3 print:border-b print:border-stone-300 print:pb-2 print:items-baseline print:justify-between">
        <h1 className="text-base font-bold text-stone-800">
          {displayTitle} {!selectedCollection && <span className="font-normal italic">Collection</span>}
        </h1>
        <p className="text-stone-500 text-[10px]">{displayGameCount} games</p>
      </div>

      {/* View Controls Bar - Compact strip */}
      {games.length > 0 && (
        <div className="bg-muted/30 border-b border-border py-2.5 px-4 sm:px-6 print:hidden">
          <div className="max-w-7xl mx-auto lg:mx-0 lg:max-w-none flex items-center justify-between">
            {/* Left: Selection controls and View toggle */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Select All checkbox for admin */}
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAllGames}
                    aria-label="Select all games"
                  />
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Select all
                  </span>
                </div>
              )}

              {/* Selection action bar */}
              {isAdmin && someSelected && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        Actions ({selectedGameIds.size})
                        <ChevronDown className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={handleBulkScrape}>
                        <RefreshCw className="size-4" />
                        Scrape Selected
                      </DropdownMenuItem>
                      {hasManualLists && (
                        <DropdownMenuItem onClick={() => openAddToListDialog(Array.from(selectedGameIds))}>
                          <FolderPlus className="size-4" />
                          Add to List
                        </DropdownMenuItem>
                      )}
                      {isViewingList && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setShowBulkContributorDialog(true)}>
                            <User className="size-4" />
                            Change Contributor
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={handleRemoveSelected}
                            disabled={removingGames}
                            className="text-destructive focus:text-destructive"
                          >
                            {removingGames ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                            Remove from List
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                </>
              )}

              {/* Separator between selection and view controls */}
              {isAdmin && <div className="h-4 w-px bg-border hidden sm:block" />}

              {/* View Toggle */}
              <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                <Button
                  variant={viewMode === "card" ? "default" : "ghost"}
                  size="icon-sm"
                  onClick={() => setViewMode("card")}
                  title="Card view"
                >
                  <LayoutGrid className="size-4" />
                  <span className="sr-only">Card view</span>
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
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="icon-sm"
                  onClick={() => setViewMode("table")}
                  title="Table view"
                >
                  <Table2 className="size-4" />
                  <span className="sr-only">Table view</span>
                </Button>
              </div>

              {/* Grouped view toggle - only for card/list views */}
              {viewMode !== "table" && (
                <Button
                  variant={isGroupedView ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setIsGroupedView(!isGroupedView)}
                  title={isGroupedView ? "Show flat list" : "Group by base game"}
                  className="gap-1.5"
                >
                  <Layers className="size-4" />
                  <span className="hidden sm:inline text-xs">
                    {isGroupedView ? "Grouped" : "Group"}
                  </span>
                </Button>
              )}

              {/* Sort Dropdown - only for card/list views, hidden for automatic lists */}
              {viewMode !== "table" && !isAutomaticList && (
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
              )}
            </div>

            {/* Right: Size slider (card view only, desktop only) */}
            {viewMode === "card" && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Size:</span>
                <input
                  id="card-size"
                  type="range"
                  min="3"
                  max="10"
                  value={columns}
                  onChange={(e) => setColumns(Number(e.target.value))}
                  className="w-24 accent-primary"
                />
                <span className="text-muted-foreground text-xs w-6 text-right">{columns}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Games Grid/List/Table */}
      <main className={cn(
        "max-w-7xl mx-auto lg:mx-0 lg:max-w-none print:px-0 print:py-0 print:max-w-none print:mx-0",
        viewMode === "table" ? "px-0 py-4" : "px-6 py-8"
      )}>
        {games.length === 0 && !selectedCollection ? (
          // Onboarding Empty State (only for main collection)
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
        ) : games.length === 0 && selectedCollection ? (
          // Empty collection state
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📦</div>
            <h2 className="text-xl font-bold text-foreground mb-2">This list is empty</h2>
            <p className="text-muted-foreground mb-4">
              Add games to &quot;{selectedCollection.name}&quot; to get started.
            </p>
            {isAdmin && isViewingList && (
              <Button onClick={() => setShowAddGamesDialog(true)} className="gap-2">
                <Plus className="size-4" />
                Add Games
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
        ) : viewMode === "card" ? (
          // Card Grid View
          <>
            <style>{`
              @media (min-width: 640px) {
                .game-grid-custom {
                  grid-template-columns: repeat(${columns}, minmax(0, 1fr)) !important;
                }
              }
            `}</style>
            {isGroupedView ? (
              // Grouped view - show base games with their expansions nested
              <div className="space-y-6">
                {groupedGames.map((group) => (
                  <div key={group.baseGame.id} className="space-y-3">
                    {/* Base game or orphaned expansion header */}
                    <div className="flex items-center gap-2">
                      {group.isOrphanedExpansion ? (
                        <div className="flex items-center gap-2 text-amber-500">
                          <AlertTriangle className="size-4" />
                          <span className="text-sm font-medium">
                            {group.missingRequirements.length > 0
                              ? `Requires: ${group.missingRequirements.join(", ")}`
                              : "Expansion (base game not in collection)"}
                          </span>
                        </div>
                      ) : group.expansions.length > 0 ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Puzzle className="size-4" />
                          <span className="text-sm font-medium">
                            {group.expansions.length} expansion{group.expansions.length !== 1 ? "s" : ""} in collection
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Base game card */}
                    <div className="game-grid-custom grid gap-3 sm:gap-4 grid-cols-2 print:grid-cols-6 print:gap-2">
                      <div className="relative">
                        {isAdmin && (
                          <div
                            className="absolute top-2 left-2 z-20"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedGameIds.has(group.baseGame.id)}
                              onCheckedChange={() => toggleGameSelection(group.baseGame.id)}
                              className="bg-background/80 backdrop-blur-sm"
                            />
                          </div>
                        )}
                        <GameCard game={group.baseGame} />
                      </div>
                    </div>

                    {/* Expansion cards - indented */}
                    {group.expansions.length > 0 && (
                      <div className="ml-6 border-l-2 border-purple-500/30 pl-4">
                        <div className="game-grid-custom grid gap-3 sm:gap-4 grid-cols-2 print:grid-cols-6 print:gap-2">
                          {group.expansions.map((expansion) => (
                            <div key={expansion.id} className="relative">
                              {isAdmin && (
                                <div
                                  className="absolute top-2 left-2 z-20"
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  <Checkbox
                                    checked={selectedGameIds.has(expansion.id)}
                                    onCheckedChange={() => toggleGameSelection(expansion.id)}
                                    className="bg-background/80 backdrop-blur-sm"
                                  />
                                </div>
                              )}
                              <GameCard game={expansion} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Flat view - original grid
              <div className="game-grid-custom grid gap-3 sm:gap-4 grid-cols-2 print:grid-cols-6 print:gap-2">
                {filteredAndSortedGames.map((game) => (
                  <div key={game.id} className="relative">
                    {/* Selection checkbox for admin */}
                    {isAdmin && (
                      <div
                        className="absolute top-2 left-2 z-20"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedGameIds.has(game.id)}
                          onCheckedChange={() => toggleGameSelection(game.id)}
                          className="bg-background/80 backdrop-blur-sm"
                        />
                      </div>
                    )}
                    <GameCard game={game} />
                  </div>
                ))}
              </div>
            )}
          </>
        ) : viewMode === "list" ? (
          // List View (compact rows)
          isGroupedView ? (
            // Grouped list view
            <div className="space-y-4">
              {groupedGames.map((group) => (
                <div key={group.baseGame.id} className="space-y-1">
                  {/* Group header */}
                  {(group.isOrphanedExpansion || group.expansions.length > 0) && (
                    <div className="flex items-center gap-2 px-3 py-1">
                      {group.isOrphanedExpansion ? (
                        <div className="flex items-center gap-2 text-amber-500 text-xs">
                          <AlertTriangle className="size-3" />
                          <span>
                            {group.missingRequirements.length > 0
                              ? `Requires: ${group.missingRequirements.slice(0, 2).join(", ")}${group.missingRequirements.length > 2 ? "..." : ""}`
                              : "Base game not in collection"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Puzzle className="size-3" />
                          <span>{group.expansions.length} expansion{group.expansions.length !== 1 ? "s" : ""}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Base game */}
                  <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                    <GameRowItem
                      game={group.baseGame}
                      isAdmin={isAdmin}
                      isSelected={selectedGameIds.has(group.baseGame.id)}
                      onSelect={toggleGameSelection}
                      onToggleVisibility={handleToggleVisibility}
                      onScrape={handleScrape}
                      onEditImages={setSelectedGameForImages}
                      onAddToList={(id) => openAddToListDialog([id])}
                      onRemoveFromList={handleRemoveFromList}
                      onEditContributor={setGameForContributorEdit}
                      isScraping={scrapingIds.has(group.baseGame.id)}
                      isInQueue={queuedIds.has(group.baseGame.id)}
                      isPending={queueStatus?.recentJobs.some(
                        (j) => j.gameId === group.baseGame.id && j.status === "pending"
                      )}
                      showRemoveFromList={!!isViewingList}
                      hasManualLists={hasManualLists}
                      showContributorEdit={!!isViewingList}
                    />
                  </div>

                  {/* Expansions - indented */}
                  {group.expansions.length > 0 && (
                    <div className="ml-6 border-l-2 border-purple-500/30 pl-4">
                      <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                        {group.expansions.map((expansion) => (
                          <GameRowItem
                            key={expansion.id}
                            game={expansion}
                            isAdmin={isAdmin}
                            isSelected={selectedGameIds.has(expansion.id)}
                            onSelect={toggleGameSelection}
                            onToggleVisibility={handleToggleVisibility}
                            onScrape={handleScrape}
                            onEditImages={setSelectedGameForImages}
                            onAddToList={(id) => openAddToListDialog([id])}
                            onRemoveFromList={handleRemoveFromList}
                            onEditContributor={setGameForContributorEdit}
                            isScraping={scrapingIds.has(expansion.id)}
                            isInQueue={queuedIds.has(expansion.id)}
                            isPending={queueStatus?.recentJobs.some(
                              (j) => j.gameId === expansion.id && j.status === "pending"
                            )}
                            showRemoveFromList={!!isViewingList}
                            hasManualLists={hasManualLists}
                            showContributorEdit={!!isViewingList}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Flat list view
            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {filteredAndSortedGames.map((game) => (
                <GameRowItem
                  key={game.id}
                  game={game}
                  isAdmin={isAdmin}
                  isSelected={selectedGameIds.has(game.id)}
                  onSelect={toggleGameSelection}
                  onToggleVisibility={handleToggleVisibility}
                  onScrape={handleScrape}
                  onEditImages={setSelectedGameForImages}
                  onAddToList={(id) => openAddToListDialog([id])}
                  onRemoveFromList={handleRemoveFromList}
                  onEditContributor={setGameForContributorEdit}
                  isScraping={scrapingIds.has(game.id)}
                  isInQueue={queuedIds.has(game.id)}
                  isPending={queueStatus?.recentJobs.some(
                    (j) => j.gameId === game.id && j.status === "pending"
                  )}
                  showRemoveFromList={!!isViewingList}
                  hasManualLists={hasManualLists}
                  showContributorEdit={!!isViewingList}
                />
              ))}
            </div>
          )
        ) : (
          // Table View - no container styling, full width
          <GameTable
              games={filteredAndSortedGames}
              isAdmin={isAdmin}
              selectedIds={selectedGameIds}
              onSelectGame={toggleGameSelection}
              sortField={tableSortField}
              sortDirection={tableSortDirection}
              onSort={handleTableSort}
              onToggleVisibility={handleToggleVisibility}
              onScrape={handleScrape}
              onEditImages={setSelectedGameForImages}
              onAddToList={(id) => openAddToListDialog([id])}
              onRemoveFromList={handleRemoveFromList}
              onEditContributor={setGameForContributorEdit}
              scrapingIds={scrapingIds}
              queuedIds={queuedIds}
              showRemoveFromList={!!isViewingList}
              hasManualLists={hasManualLists}
              showInCollectionColumn={!!selectedCollection && !selectedCollection.isPrimary}
              showContributorEdit={!!isViewingList}
            />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6 print:hidden">
        <div className="max-w-7xl mx-auto lg:mx-0 lg:max-w-none flex flex-col items-center gap-4">
          <a
            href="https://boardgamegeek.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group px-4 py-2 rounded-lg hover:bg-muted/50 transition-all"
          >
            {/* Light mode logo */}
            <Image
              src="/powered-by-bgg-rgb.svg"
              alt="Powered by BoardGameGeek"
              width={200}
              height={40}
              className="h-10 w-auto opacity-80 group-hover:opacity-100 transition-opacity dark:hidden"
            />
            {/* Dark mode logo */}
            <Image
              src="/powered-by-bgg.svg"
              alt="Powered by BoardGameGeek"
              width={200}
              height={40}
              className="h-10 w-auto opacity-80 group-hover:opacity-100 transition-opacity hidden dark:block"
            />
          </a>
          <div className="flex items-center gap-3 text-muted-foreground text-xs">
            {bggUsername && !selectedCollection && (
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
                Print {selectedCollection ? "List" : "Collection"}
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Dialogs */}
      {selectedCollection && (
        <>
          <EditListDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            list={{
              id: selectedCollection.id,
              name: selectedCollection.name,
              description: selectedCollection.description,
            }}
          />
          <DuplicateListDialog
            open={showDuplicateDialog}
            onOpenChange={setShowDuplicateDialog}
            list={{
              id: selectedCollection.id,
              name: selectedCollection.name,
              description: selectedCollection.description,
            }}
          />
          <ShareListDialog
            open={showShareDialog}
            onOpenChange={setShowShareDialog}
            list={{
              id: selectedCollection.id,
              name: selectedCollection.name,
              description: selectedCollection.description,
              isPublic: selectedCollection.isPublic,
              shareToken: selectedCollection.shareToken,
            }}
            onUpdated={() => router.refresh()}
          />
          <DeleteListDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            list={{
              id: selectedCollection.id,
              name: selectedCollection.name,
              description: selectedCollection.description,
            }}
          />
          <AddGamesToListDialog
            open={showAddGamesDialog}
            onOpenChange={setShowAddGamesDialog}
            listId={selectedCollection.id}
            listName={selectedCollection.name}
            existingGameIds={existingGameIds}
            showContributor={isViewingList}
            onGamesAdded={() => router.refresh()}
          />
        </>
      )}

      {/* Image Editor Dialog */}
      {selectedGameForImages && (
        <ImageEditor
          game={selectedGameForImages}
          onClose={() => setSelectedGameForImages(null)}
          onSave={() => router.refresh()}
        />
      )}

      {/* Edit Contributor Dialog */}
      {gameForContributorEdit && (
        <EditContributorDialog
          open={!!gameForContributorEdit}
          onOpenChange={(open) => !open && setGameForContributorEdit(null)}
          gameName={gameForContributorEdit.name}
          currentContributor={gameForContributorEdit.contributor ?? null}
          onSave={handleUpdateContributor}
        />
      )}

      {/* Bulk Edit Contributor Dialog */}
      {isViewingList && showBulkContributorDialog && (
        <BulkEditContributorDialog
          open={showBulkContributorDialog}
          onOpenChange={setShowBulkContributorDialog}
          gameCount={selectedGameIds.size}
          onSave={handleBulkUpdateContributor}
        />
      )}

      {/* Add to List Dialog */}
      <Dialog
        open={showAddToListDialog}
        onOpenChange={(open) => {
          setShowAddToListDialog(open);
          if (!open) setGameIdsToAddToList([]);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center">
                <FolderPlus className="size-6 text-primary" />
              </div>
              Add to List
            </DialogTitle>
            <DialogDescription>
              Add {gameIdsToAddToList.length} game{gameIdsToAddToList.length !== 1 ? "s" : ""} to a list
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {manualCollections.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                No lists available. Create a list first.
              </p>
            ) : (
              manualCollections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => handleDialogAddToList(collection.id)}
                  disabled={addingToList}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors",
                    "bg-muted/50 hover:bg-muted",
                    addingToList && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className="font-medium text-foreground">{collection.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {collection.gameCount} game{collection.gameCount !== 1 ? "s" : ""}
                  </span>
                </button>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddToListDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
