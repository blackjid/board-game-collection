"use client";

import { useState, useMemo, useCallback } from "react";
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
  Settings as SettingsIcon,
  LogIn,
  Printer,
  ExternalLink,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Check,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { cn } from "@/lib/utils";

import { SiteHeader } from "@/components/SiteHeader";
import { GameCard } from "@/components/GameCard";
import { GameListItem } from "@/components/GameListItem";
import { EditListDialog, DeleteListDialog } from "@/components/ListDialogs";
import { AddGamesToListDialog } from "@/components/AddGamesToListDialog";
import type { GameData } from "@/lib/games";

type SortOption = "name" | "year" | "rating";
type ViewMode = "grid" | "list";

interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface SelectedCollection {
  id: string;
  name: string;
  description: string | null;
  type: string;
  isPrimary: boolean;
  bggUsername: string | null;
  gameCount: number;
}

interface HomeClientProps {
  games: GameData[];
  totalGames: number;
  collectionName: string | null;
  bggUsername: string | null;
  lastSyncedAt: string | null;
  currentUser: CurrentUser | null;
  selectedCollection: SelectedCollection | null;
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
  selectedCollection,
}: HomeClientProps) {
  const router = useRouter();
  const [columns, setColumns] = useState(6);
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [syncing, setSyncing] = useState(false);

  // Admin list management state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddGamesDialog, setShowAddGamesDialog] = useState(false);

  // Bulk selection state
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
  const [removingGames, setRemovingGames] = useState(false);

  // Inline edit state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const isAdmin = currentUser?.role === "admin";
  const isViewingList = selectedCollection && !selectedCollection.isPrimary && selectedCollection.type === "manual";

  // Determine the display title based on whether a collection is selected
  const displayTitle = selectedCollection
    ? selectedCollection.name
    : collectionName || (bggUsername ? `${bggUsername}'s` : "Board Game");

  const displayGameCount = selectedCollection ? games.length : totalGames;

  // Get the link for "Pick a Game" - include collection if one is selected
  const pickGameHref = selectedCollection
    ? `/pick/collection/${selectedCollection.id}`
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

  // Inline title edit handlers
  const startEditingTitle = () => {
    if (selectedCollection) {
      setEditedName(selectedCollection.name);
      setIsEditingTitle(true);
    }
  };

  const saveEditedTitle = async () => {
    if (!selectedCollection || !editedName.trim()) return;
    setSavingName(true);

    try {
      const response = await fetch(`/api/collections/${selectedCollection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editedName.trim() }),
      });

      if (response.ok) {
        setIsEditingTitle(false);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update list name:", error);
    } finally {
      setSavingName(false);
    }
  };

  const cancelEditingTitle = () => {
    setIsEditingTitle(false);
    setEditedName("");
  };

  // Selection state derived values
  const allSelected = selectedGameIds.size === filteredAndSortedGames.length && filteredAndSortedGames.length > 0;
  const someSelected = selectedGameIds.size > 0;

  // Header actions
  const headerActions = (
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
      <SiteHeader breadcrumbs={breadcrumbs} actions={headerActions} />

      {/* Content Header - Title, meta, search */}
      <div className="bg-gradient-to-b from-card to-card/95 border-b border-border print:hidden px-4 sm:px-6 py-4 sm:py-5">
        <div className="max-w-7xl mx-auto lg:mx-0 lg:max-w-none">
          {/* Title and meta */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Title - editable for admin when viewing a list */}
              {isEditingTitle && isAdmin && isViewingList ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEditedTitle();
                      if (e.key === "Escape") cancelEditingTitle();
                    }}
                    className="text-xl font-bold h-10 max-w-sm"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={saveEditedTitle}
                    disabled={savingName || !editedName.trim()}
                  >
                    {savingName ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={cancelEditingTitle}>
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate">
                    <span className="text-foreground">{displayTitle}</span>
                    {!selectedCollection && (
                      <span className="text-primary/80 font-light ml-2 italic">Collection</span>
                    )}
                  </h1>
                  {isAdmin && isViewingList && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-foreground"
                      onClick={startEditingTitle}
                      title="Edit list name"
                    >
                      <Pencil className="size-4" />
                    </Button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 mt-1">
                <span className="text-muted-foreground text-sm">
                  {displayGameCount} game{displayGameCount !== 1 ? "s" : ""}
                </span>
                {!selectedCollection && lastSyncedAt && isAdmin && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-muted-foreground text-sm">
                      Synced {formatRelativeTime(lastSyncedAt)}
                    </span>
                  </>
                )}
                {selectedCollection?.description && (
                  <>
                    <span className="text-muted-foreground/50 hidden sm:inline">•</span>
                    <span className="text-muted-foreground text-sm hidden sm:inline truncate max-w-[200px]">
                      {selectedCollection.description}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Search bar */}
          {games.length > 0 && (
            <div className="mt-4">
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
            {/* Left: Selection controls (admin list view) or View toggle */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Select All checkbox for admin list view */}
              {isAdmin && isViewingList && (
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
              {isAdmin && isViewingList && someSelected && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveSelected}
                    disabled={removingGames}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    {removingGames ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    Remove {selectedGameIds.size}
                  </Button>
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
              {isAdmin && isViewingList && <div className="h-4 w-px bg-border hidden sm:block" />}

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
      <main className="max-w-7xl mx-auto lg:mx-0 lg:max-w-none px-6 py-8 print:px-0 print:py-0 print:max-w-none print:mx-0">
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
                <div key={game.id} className="relative">
                  {/* Selection checkbox for admin list view */}
                  {isAdmin && isViewingList && (
                    <div className="absolute top-2 left-2 z-10">
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
          </>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredAndSortedGames.map((game) => (
              <div key={game.id} className="flex items-center gap-3">
                {/* Selection checkbox for admin list view */}
                {isAdmin && isViewingList && (
                  <Checkbox
                    checked={selectedGameIds.has(game.id)}
                    onCheckedChange={() => toggleGameSelection(game.id)}
                  />
                )}
                <div className="flex-1">
                  <GameListItem game={game} />
                </div>
              </div>
            ))}
          </div>
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
            <Image
              src="/powered-by-bgg.svg"
              alt="Powered by BoardGameGeek"
              width={200}
              height={40}
              className="h-10 w-auto opacity-80 group-hover:opacity-100 transition-opacity"
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
            onGamesAdded={() => router.refresh()}
          />
        </>
      )}
    </div>
  );
}
