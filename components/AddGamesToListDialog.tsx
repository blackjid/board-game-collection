"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Search,
  Loader2,
  ImageIcon,
  Check,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface CollectionGame {
  id: string;
  name: string;
  yearPublished: number | null;
  thumbnail: string | null;
  image: string | null;
  selectedThumbnail: string | null;
  isExpansion: boolean;
}

interface BggSearchResult {
  id: string;
  name: string;
  yearPublished: number | null;
  thumbnail: string | null;
  isInMainCollection: boolean;
  isExpansion: boolean;
}

interface AddGamesToListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  listName: string;
  /** IDs of games already in this list */
  existingGameIds: Set<string>;
  onGamesAdded?: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

export function AddGamesToListDialog({
  open,
  onOpenChange,
  listId,
  listName,
  existingGameIds,
  onGamesAdded,
}: AddGamesToListDialogProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"collection" | "bgg">("collection");

  // Collection tab state
  const [collectionGames, setCollectionGames] = useState<CollectionGame[]>([]);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [collectionFilter, setCollectionFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // BGG search tab state
  const [bggQuery, setBggQuery] = useState("");
  const [bggResults, setBggResults] = useState<BggSearchResult[]>([]);
  const [bggSearching, setBggSearching] = useState(false);
  const [addingGameId, setAddingGameId] = useState<string | null>(null);

  // Saving state
  const [saving, setSaving] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setActiveTab("collection");
      setSelectedIds(new Set());
      setCollectionFilter("");
      setBggQuery("");
      setBggResults([]);
      fetchCollectionGames();
    }
  }, [open]);

  // Fetch games from primary collection
  const fetchCollectionGames = async () => {
    setCollectionLoading(true);
    try {
      const response = await fetch("/api/games?active=true");
      if (response.ok) {
        const data = await response.json();
        setCollectionGames(data.games || []);
      }
    } catch (error) {
      console.error("Failed to fetch collection games:", error);
    } finally {
      setCollectionLoading(false);
    }
  };

  // Filter collection games
  const filteredCollectionGames = useMemo(() => {
    if (!collectionFilter.trim()) return collectionGames;
    const query = collectionFilter.toLowerCase();
    return collectionGames.filter((game) =>
      game.name.toLowerCase().includes(query)
    );
  }, [collectionGames, collectionFilter]);

  // Toggle game selection
  const toggleSelection = useCallback((gameId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  }, []);

  // Add selected games from collection
  const handleAddSelected = async () => {
    if (selectedIds.size === 0) return;
    setSaving(true);

    try {
      // Add each selected game to the list
      const promises = Array.from(selectedIds).map(async (gameId) => {
        const game = collectionGames.find((g) => g.id === gameId);
        if (!game) return;

        await fetch(`/api/collections/${listId}/games`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: game.id,
            name: game.name,
            yearPublished: game.yearPublished,
            isExpansion: game.isExpansion,
          }),
        });
      });

      await Promise.all(promises);

      onOpenChange(false);
      if (onGamesAdded) {
        onGamesAdded();
      }
      router.refresh();
    } catch (error) {
      console.error("Failed to add games:", error);
    } finally {
      setSaving(false);
    }
  };

  // Search BGG
  const handleBggSearch = async () => {
    if (bggQuery.length < 2) return;
    setBggSearching(true);
    try {
      const response = await fetch(
        `/api/bgg/search?q=${encodeURIComponent(bggQuery)}`
      );
      if (response.ok) {
        const data = await response.json();
        setBggResults(data.results || []);
      }
    } catch (error) {
      console.error("BGG search failed:", error);
    } finally {
      setBggSearching(false);
    }
  };

  // Add single game from BGG search
  const handleAddFromBgg = async (game: BggSearchResult) => {
    setAddingGameId(game.id);
    try {
      const response = await fetch(`/api/collections/${listId}/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          name: game.name,
          yearPublished: game.yearPublished,
          isExpansion: game.isExpansion,
        }),
      });

      if (response.ok) {
        // Update the existingGameIds set by refreshing
        if (onGamesAdded) {
          onGamesAdded();
        }
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to add game:", error);
    } finally {
      setAddingGameId(null);
    }
  };

  // Check if a game is already in the list (from existingGameIds prop or just added)
  const isInList = useCallback(
    (gameId: string) => existingGameIds.has(gameId),
    [existingGameIds]
  );

  // Count of selectable games (not already in list)
  const selectableCount = filteredCollectionGames.filter(
    (g) => !isInList(g.id)
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Games to &quot;{listName}&quot;</DialogTitle>
          <DialogDescription>
            Select games from your collection or search BoardGameGeek.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "collection" | "bgg")}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="w-full">
            <TabsTrigger value="collection" className="flex-1">
              From Collection
            </TabsTrigger>
            <TabsTrigger value="bgg" className="flex-1">
              Search BGG
            </TabsTrigger>
          </TabsList>

          {/* From Collection Tab */}
          <TabsContent value="collection" className="flex-1 flex flex-col min-h-0 mt-4">
            {/* Filter input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Filter collection..."
                value={collectionFilter}
                onChange={(e) => setCollectionFilter(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Games grid */}
            <ScrollArea className="flex-1 border rounded-lg min-h-[300px]">
              {collectionLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredCollectionGames.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <ImageIcon className="size-10 mb-2" />
                  <p className="text-sm">
                    {collectionFilter
                      ? "No games match your filter"
                      : "No games in collection"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3">
                  {filteredCollectionGames.map((game) => {
                    const inList = isInList(game.id);
                    const selected = selectedIds.has(game.id);
                    const thumbnail =
                      game.selectedThumbnail || game.thumbnail || game.image;

                    return (
                      <button
                        key={game.id}
                        type="button"
                        disabled={inList}
                        onClick={() => !inList && toggleSelection(game.id)}
                        className={cn(
                          "relative flex flex-col items-center p-2 rounded-lg border transition-colors text-left",
                          inList
                            ? "opacity-50 cursor-not-allowed bg-muted"
                            : selected
                            ? "border-primary bg-primary/10"
                            : "hover:bg-muted/50 border-transparent"
                        )}
                      >
                        {/* Checkbox */}
                        <div className="absolute top-2 left-2 z-10">
                          {inList ? (
                            <div className="size-5 rounded bg-emerald-500 flex items-center justify-center">
                              <Check className="size-3 text-white" />
                            </div>
                          ) : (
                            <Checkbox
                              checked={selected}
                              onCheckedChange={() => toggleSelection(game.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>

                        {/* Thumbnail */}
                        <div className="w-16 h-16 rounded bg-muted overflow-hidden mb-2">
                          {thumbnail ? (
                            <Image
                              src={thumbnail}
                              alt=""
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="size-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Name */}
                        <span className="text-xs font-medium text-center line-clamp-2 w-full">
                          {game.name}
                        </span>
                        {game.isExpansion && (
                          <Badge variant="secondary" className="text-[9px] mt-1">
                            Exp
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Selection summary */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size > 0
                  ? `${selectedIds.size} game${selectedIds.size !== 1 ? "s" : ""} selected`
                  : `${selectableCount} game${selectableCount !== 1 ? "s" : ""} available`}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddSelected}
                  disabled={selectedIds.size === 0 || saving}
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="size-4" />
                      Add {selectedIds.size > 0 ? selectedIds.size : ""} Game
                      {selectedIds.size !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Search BGG Tab */}
          <TabsContent value="bgg" className="flex-1 flex flex-col min-h-0 mt-4">
            {/* Search input */}
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Search BoardGameGeek..."
                value={bggQuery}
                onChange={(e) => setBggQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBggSearch()}
              />
              <Button
                onClick={handleBggSearch}
                disabled={bggQuery.length < 2 || bggSearching}
              >
                {bggSearching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
              </Button>
            </div>

            {/* Results list */}
            <ScrollArea className="flex-1 border rounded-lg min-h-[300px]">
              {bggResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <Search className="size-10 mb-2" />
                  <p className="text-sm">
                    {bggSearching
                      ? "Searching..."
                      : "Search for games to add"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {bggResults.map((game) => {
                    const inList = isInList(game.id);
                    const isAdding = addingGameId === game.id;

                    return (
                      <div
                        key={game.id}
                        className={cn(
                          "p-3 flex items-center gap-3",
                          inList && "opacity-50"
                        )}
                      >
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded bg-muted overflow-hidden flex-shrink-0">
                          {game.thumbnail ? (
                            <Image
                              src={game.thumbnail}
                              alt=""
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="size-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {game.name}
                            </span>
                            {game.isExpansion && (
                              <Badge variant="secondary" className="text-[10px]">
                                Exp
                              </Badge>
                            )}
                            {game.isInMainCollection && (
                              <Badge variant="outline" className="text-[10px]">
                                Owned
                              </Badge>
                            )}
                          </div>
                          {game.yearPublished && (
                            <span className="text-xs text-muted-foreground">
                              {game.yearPublished}
                            </span>
                          )}
                        </div>

                        {/* Add button */}
                        <Button
                          size="sm"
                          variant={inList ? "ghost" : "secondary"}
                          onClick={() => !inList && handleAddFromBgg(game)}
                          disabled={inList || isAdding}
                        >
                          {isAdding ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : inList ? (
                            <>
                              <Check className="size-4" />
                              Added
                            </>
                          ) : (
                            <>
                              <Plus className="size-4" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            <DialogFooter className="mt-3 pt-3 border-t">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
