"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  Search,
  Loader2,
  ImageIcon,
  Check,
  Plus,
  Dice6,
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

export interface GameOption {
  id: string;
  name: string;
  yearPublished?: number | null;
  thumbnail?: string | null;
  image?: string | null;
  selectedThumbnail?: string | null;
  isExpansion?: boolean;
}

export interface SelectedGame {
  id: string;
  name: string;
  yearPublished: number | null;
  thumbnail: string | null;
  isExpansion: boolean;
  isFromBgg: boolean; // True if selected from BGG search
}

interface BggSearchResult {
  id: string;
  name: string;
  yearPublished: number | null;
  thumbnail: string | null;
  isInMainCollection: boolean;
  isExpansion: boolean;
}

interface GameSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "single" | "multi";
  onSelect: (games: SelectedGame[]) => void;
  title?: string;
  description?: string;
  collectionGames?: GameOption[];
  existingGameIds?: Set<string>;
}

// ============================================================================
// Main Component
// ============================================================================

export function GameSelectorDialog({
  open,
  onOpenChange,
  mode,
  onSelect,
  title = "Select Games",
  description = "Choose games from your collection or search BoardGameGeek.",
  collectionGames: providedGames,
  existingGameIds = new Set(),
}: GameSelectorDialogProps) {
  const [activeTab, setActiveTab] = useState<"collection" | "bgg">("collection");

  // Collection tab state
  const [collectionGames, setCollectionGames] = useState<GameOption[]>(providedGames || []);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [collectionFilter, setCollectionFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // BGG search tab state
  const [bggQuery, setBggQuery] = useState("");
  const [bggResults, setBggResults] = useState<BggSearchResult[]>([]);
  const [bggSearching, setBggSearching] = useState(false);
  const [processingGameId, setProcessingGameId] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setActiveTab("collection");
      setSelectedIds(new Set());
      setCollectionFilter("");
      setBggQuery("");
      setBggResults([]);

      // Fetch games if not provided
      if (!providedGames) {
        fetchCollectionGames();
      }
    }
  }, [open, providedGames]);

  // Update collection games when providedGames changes
  useEffect(() => {
    if (providedGames) {
      setCollectionGames(providedGames);
    }
  }, [providedGames]);

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

  // Toggle game selection (multi mode only)
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

  // Handle game selection (single mode)
  const handleSingleSelect = (game: GameOption, isFromBgg = false) => {
    const selectedGame: SelectedGame = {
      id: game.id,
      name: game.name,
      yearPublished: game.yearPublished ?? null,
      thumbnail: game.selectedThumbnail || game.thumbnail || game.image || null,
      isExpansion: game.isExpansion ?? false,
      isFromBgg,
    };
    onSelect([selectedGame]);
    onOpenChange(false);
  };

  // Handle multi-select confirm
  const handleMultiSelectConfirm = () => {
    if (selectedIds.size === 0) return;

    const selectedGames = Array.from(selectedIds).map((gameId) => {
      // Try to find game in collection first
      let game = collectionGames.find((g) => g.id === gameId);
      let isFromBgg = false;

      // If not found in collection, try BGG results
      if (!game) {
        const bggGame = bggResults.find((g) => g.id === gameId);
        if (bggGame) {
          game = {
            id: bggGame.id,
            name: bggGame.name,
            yearPublished: bggGame.yearPublished,
            thumbnail: bggGame.thumbnail,
            isExpansion: bggGame.isExpansion,
          };
          isFromBgg = true;
        }
      }

      if (!game) return null;

      return {
        id: game.id,
        name: game.name,
        yearPublished: game.yearPublished ?? null,
        thumbnail: game.selectedThumbnail || game.thumbnail || game.image || null,
        isExpansion: game.isExpansion ?? false,
        isFromBgg,
      };
    }).filter((g): g is SelectedGame => g !== null);

    onSelect(selectedGames);
    onOpenChange(false);
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

  // Handle BGG game selection - ensure it exists in DB first (only when selecting, not deselecting)
  const handleBggSelect = async (game: BggSearchResult) => {
    // If already selected, just toggle off (no API call needed)
    if (selectedIds.has(game.id)) {
      toggleSelection(game.id);
      return;
    }

    // Selecting a new game - need to ensure it exists in DB
    setProcessingGameId(game.id);
    try {
      // Ensure game exists in database
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          name: game.name,
          yearPublished: game.yearPublished,
          isExpansion: game.isExpansion,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("Failed to create game:", errorData);
        alert(`Failed to add game: ${errorData.error || "Unknown error"}`);
        setProcessingGameId(null);
        return;
      }

      const data = await response.json();
      const gameData: GameOption = {
        id: data.game.id,
        name: data.game.name,
        yearPublished: data.game.yearPublished,
        thumbnail: data.game.thumbnail,
        isExpansion: data.game.isExpansion,
      };

      if (mode === "single") {
        handleSingleSelect(gameData, true);
      } else {
        // In multi mode, add to selection
        toggleSelection(game.id);
      }
    } catch (error) {
      console.error("Failed to process BGG game:", error);
      alert(`Failed to add game: ${error instanceof Error ? error.message : "Network error"}`);
    } finally {
      setProcessingGameId(null);
    }
  };

  // Check if a game is already in the existing set
  const isInExisting = useCallback(
    (gameId: string) => existingGameIds.has(gameId),
    [existingGameIds]
  );

  // Count of selectable games (not already in existing set)
  const selectableCount = filteredCollectionGames.filter(
    (g) => !isInExisting(g.id)
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
            <div className="relative mb-3 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Filter collection..."
                value={collectionFilter}
                onChange={(e) => setCollectionFilter(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Games grid/list */}
            <ScrollArea className="flex-1 border rounded-lg min-h-0">
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
              ) : mode === "multi" ? (
                // Multi-select mode: Grid with checkboxes
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-3">
                  {filteredCollectionGames.map((game) => {
                    const inExisting = isInExisting(game.id);
                    const selected = selectedIds.has(game.id);
                    const thumbnail =
                      game.selectedThumbnail || game.thumbnail || game.image;

                    return (
                      <div
                        key={game.id}
                        role="button"
                        tabIndex={inExisting ? -1 : 0}
                        aria-disabled={inExisting}
                        onClick={() => !inExisting && toggleSelection(game.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (!inExisting) toggleSelection(game.id);
                          }
                        }}
                        className={cn(
                          "relative flex flex-col items-center p-2 rounded-lg border transition-colors text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          inExisting
                            ? "opacity-50 cursor-not-allowed bg-muted"
                            : selected
                            ? "border-primary bg-primary/10"
                            : "hover:bg-muted/50 border-transparent"
                        )}
                      >
                        {/* Checkbox */}
                        <div className="absolute top-2 left-2 z-10">
                          {inExisting ? (
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
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Single-select mode: List with clickable rows
                <div className="space-y-1 p-2">
                  {filteredCollectionGames.map((game) => {
                    const thumbnail =
                      game.selectedThumbnail || game.thumbnail || game.image;

                    return (
                      <button
                        key={game.id}
                        onClick={() => handleSingleSelect(game)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <div className="relative w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0">
                          {thumbnail ? (
                            <Image
                              src={thumbnail}
                              alt={game.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Dice6 className="size-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block">
                            {game.name}
                          </span>
                          {game.yearPublished && (
                            <span className="text-xs text-muted-foreground">
                              {game.yearPublished}
                            </span>
                          )}
                        </div>
                        {game.isExpansion && (
                          <Badge variant="secondary" className="text-[10px]">
                            Exp
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Footer for multi-select mode */}
            {mode === "multi" && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t flex-shrink-0">
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
                    onClick={handleMultiSelectConfirm}
                    disabled={selectedIds.size === 0}
                  >
                    <Plus className="size-4 mr-2" />
                    Add {selectedIds.size > 0 ? selectedIds.size : ""} Game
                    {selectedIds.size !== 1 ? "s" : ""}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Search BGG Tab */}
          <TabsContent value="bgg" className="flex-1 flex flex-col min-h-0 mt-4">
            {/* Search input */}
            <div className="flex gap-2 mb-3 flex-shrink-0">
              <Input
                placeholder="Search BoardGameGeek..."
                value={bggQuery}
                onChange={(e) => setBggQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBggSearch()}
              />
              <Button
                type="button"
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
            <ScrollArea className="flex-1 border rounded-lg min-h-0">
              <div className="w-full">
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
                    const inExisting = isInExisting(game.id);
                    const isProcessing = processingGameId === game.id;
                    const selected = selectedIds.has(game.id);

                    // In single mode, make the entire row clickable
                    if (mode === "single") {
                      return (
                        <button
                          key={game.id}
                          type="button"
                          onClick={() => handleBggSelect(game)}
                          disabled={isProcessing}
                          className="w-full p-3 grid grid-cols-[48px_1fr_auto] items-center gap-3 hover:bg-muted transition-colors text-left disabled:opacity-50"
                        >
                          {/* Thumbnail */}
                          <div className="w-12 h-12 rounded bg-muted overflow-hidden">
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
                          <div className="min-w-0 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {game.name}
                              </span>
                              {game.isExpansion && (
                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                  Exp
                                </Badge>
                              )}
                              {game.isInMainCollection && (
                                <Badge variant="outline" className="text-[10px] shrink-0">
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

                          {/* Loading indicator */}
                          <div>
                            {isProcessing && (
                              <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </button>
                      );
                    }

                    // Multi mode: clickable row with checkbox
                    return (
                      <div
                        key={game.id}
                        role="button"
                        tabIndex={inExisting ? -1 : 0}
                        aria-disabled={inExisting}
                        onClick={() => {
                          if (!inExisting && !isProcessing) {
                            handleBggSelect(game);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (!inExisting && !isProcessing) {
                              handleBggSelect(game);
                            }
                          }
                        }}
                        className={cn(
                          "p-3 grid grid-cols-[auto_48px_1fr] items-center gap-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          inExisting
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer hover:bg-muted/50",
                          selected && "bg-primary/10"
                        )}
                      >
                        {/* Checkbox */}
                        <div>
                          {isProcessing ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : inExisting ? (
                            <div className="size-5 rounded bg-emerald-500 flex items-center justify-center">
                              <Check className="size-3 text-white" />
                            </div>
                          ) : (
                            <Checkbox
                              checked={selected}
                              onCheckedChange={() => handleBggSelect(game)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>

                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded bg-muted overflow-hidden">
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
                        <div className="min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {game.name}
                            </span>
                            {game.isExpansion && (
                              <Badge variant="secondary" className="text-[10px] shrink-0">
                                Exp
                              </Badge>
                            )}
                            {game.isInMainCollection && (
                              <Badge variant="outline" className="text-[10px] shrink-0">
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
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
            </ScrollArea>

            {/* Footer for single mode */}
            {mode === "single" && (
              <DialogFooter className="mt-3 pt-3 border-t flex-shrink-0">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            )}

            {/* Footer for multi mode */}
            {mode === "multi" && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t flex-shrink-0">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} game${selectedIds.size !== 1 ? "s" : ""} selected`
                    : "Search and add games from BGG"}
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleMultiSelectConfirm}
                    disabled={selectedIds.size === 0}
                  >
                    <Plus className="size-4 mr-2" />
                    Add {selectedIds.size > 0 ? selectedIds.size : ""} Game
                    {selectedIds.size !== 1 ? "s" : ""}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
