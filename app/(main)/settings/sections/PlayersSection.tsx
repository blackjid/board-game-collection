"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Edit, UserPlus, ChevronDown, MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
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
import { useRowSelection } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";
import type { PlayerData } from "@/types/player";

export function PlayersSection() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerData | null>(null);
  const [playerFormData, setPlayerFormData] = useState({
    displayName: "",
    firstName: "",
    lastName: "",
  });
  const [savingPlayer, setSavingPlayer] = useState(false);
  const [playerError, setPlayerError] = useState("");

  // Row selection for bulk actions
  const {
    selectedCount,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    allSelected,
    someSelected,
    selectedItems,
  } = useRowSelection({
    items: players,
    getItemId: (player) => player.id,
  });

  const fetchPlayers = useCallback(async () => {
    try {
      const response = await fetch("/api/players");
      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players);
      }
    } catch (error) {
      console.error("Failed to fetch players:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const handleOpenPlayerModal = (player?: PlayerData) => {
    if (player) {
      setEditingPlayer(player);
      setPlayerFormData({
        displayName: player.displayName,
        firstName: player.firstName || "",
        lastName: player.lastName || "",
      });
    } else {
      setEditingPlayer(null);
      setPlayerFormData({ displayName: "", firstName: "", lastName: "" });
    }
    setPlayerError("");
    setShowPlayerModal(true);
  };

  const handleSavePlayer = async () => {
    setSavingPlayer(true);
    setPlayerError("");

    try {
      if (editingPlayer) {
        const response = await fetch(`/api/players/${editingPlayer.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: playerFormData.displayName || undefined,
            firstName: playerFormData.firstName || undefined,
            lastName: playerFormData.lastName || undefined,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          setPlayerError(data.error || "Failed to update player");
          return;
        }
      } else {
        if (!playerFormData.displayName) {
          setPlayerError("Display name is required");
          return;
        }

        const response = await fetch("/api/players", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: playerFormData.displayName,
            firstName: playerFormData.firstName || undefined,
            lastName: playerFormData.lastName || undefined,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          setPlayerError(data.error || "Failed to create player");
          return;
        }
      }

      await fetchPlayers();
      setShowPlayerModal(false);
    } finally {
      setSavingPlayer(false);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm("Are you sure you want to delete this player? This will not delete associated plays.")) return;

    const response = await fetch(`/api/players/${playerId}`, { method: "DELETE" });
    if (response.ok) {
      await fetchPlayers();
    } else {
      const data = await response.json();
      alert(data.error || "Failed to delete player");
    }
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCount} player(s)? This will not delete associated plays.`)) return;

    await Promise.all(
      selectedItems.map((player) =>
        fetch(`/api/players/${player.id}`, { method: "DELETE" })
      )
    );
    clearSelection();
    await fetchPlayers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading players...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Players</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage player information and track play statistics
          </p>
        </div>
        <Button onClick={() => handleOpenPlayerModal()}>
          <UserPlus className="size-4" />
          Add Player
        </Button>
      </div>

      <Card className="gap-0">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg">{players.length} Players</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {/* Select All Header with Bulk Actions */}
          {players.length > 0 && (
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
                  ? `${selectedCount} player${selectedCount !== 1 ? "s" : ""} selected`
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
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={handleBulkDelete}
                      >
                        <Trash2 className="size-4" />
                        Delete Selected
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="divide-y divide-border">
            {players.map((player) => {
              // Actions component for both context menu and dropdown
              const PlayerActions = ({ asContext = false }: { asContext?: boolean }) => {
                const MenuItem = asContext ? ContextMenuItem : DropdownMenuItem;
                const MenuSeparator = asContext ? ContextMenuSeparator : DropdownMenuSeparator;

                return (
                  <>
                    <MenuItem onClick={() => handleOpenPlayerModal(player)}>
                      <Edit className="size-4" />
                      Edit
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDeletePlayer(player.id)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </MenuItem>
                  </>
                );
              };

              return (
                <ContextMenu key={player.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      className={cn(
                        "p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:bg-muted/50 transition-colors cursor-default",
                        isSelected(player.id) && "bg-primary/5"
                      )}
                    >
                      {/* Checkbox */}
                      <Checkbox
                        checked={isSelected(player.id)}
                        onCheckedChange={() => toggleItem(player.id)}
                        aria-label={`Select ${player.displayName}`}
                      />

                      <Avatar className="size-10 bg-secondary flex-shrink-0">
                        <AvatarFallback className="bg-secondary text-secondary-foreground font-bold">
                          {player.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground truncate text-sm sm:text-base">
                            {player.displayName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground mt-0.5">
                          {(player.firstName || player.lastName) && (
                            <>
                              <span className="truncate">
                                {[player.firstName, player.lastName].filter(Boolean).join(" ")}
                              </span>
                              <span className="hidden sm:inline">•</span>
                            </>
                          )}
                          <span className="hidden sm:inline">
                            {player.playCount || 0} play{player.playCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      {/* Play Count Badge */}
                      <Badge
                        variant="secondary"
                        className="text-xs hidden sm:flex"
                      >
                        {player.playCount || 0} plays
                      </Badge>

                      {/* Status dot for mobile */}
                      <div
                        className="size-2 rounded-full sm:hidden flex-shrink-0 bg-muted-foreground"
                        title={`${player.playCount || 0} plays`}
                      />

                      {/* Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                            <MoreVertical className="size-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <PlayerActions />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <PlayerActions asContext />
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
            {players.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No players found. Add your first player to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Player Modal */}
      <Dialog open={showPlayerModal} onOpenChange={setShowPlayerModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPlayer ? "Edit Player" : "Create Player"}
            </DialogTitle>
            <DialogDescription>
              {editingPlayer ? "Update player information" : "Add a new player to the registry"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                type="text"
                value={playerFormData.displayName}
                onChange={(e) => setPlayerFormData({ ...playerFormData, displayName: e.target.value })}
                placeholder="John"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName">First Name (optional)</Label>
              <Input
                id="firstName"
                type="text"
                value={playerFormData.firstName}
                onChange={(e) => setPlayerFormData({ ...playerFormData, firstName: e.target.value })}
                placeholder="John"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name (optional)</Label>
              <Input
                id="lastName"
                type="text"
                value={playerFormData.lastName}
                onChange={(e) => setPlayerFormData({ ...playerFormData, lastName: e.target.value })}
                placeholder="Smith"
              />
            </div>

            {playerError && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                {playerError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPlayerModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePlayer} disabled={savingPlayer}>
              {savingPlayer ? "Saving..." : editingPlayer ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
