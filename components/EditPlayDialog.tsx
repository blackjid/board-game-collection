"use client";

import { useState, useEffect } from "react";
import { Loader2, Trophy, X, Plus, UserX } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlayerInput } from "@/components/PlayerInput";
import { LocationInput } from "@/components/LocationInput";
import { ExpansionSelector, type ExpansionOption } from "@/components/ExpansionSelector";
import type { GamePlayData } from "@/types/play";

// ============================================================================
// Types
// ============================================================================

interface Player {
  id: string;
  name: string;
  playerId?: string | null;
  isGuest: boolean;
  isWinner: boolean;
}

interface EditPlayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  play: GamePlayData;
  onPlayUpdated?: () => void;
  availableExpansions?: ExpansionOption[];
}

// ============================================================================
// Edit Play Dialog
// ============================================================================

export function EditPlayDialog({
  open,
  onOpenChange,
  play,
  onPlayUpdated,
  availableExpansions = [],
}: EditPlayDialogProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playedAt, setPlayedAt] = useState("");
  const [location, setLocation] = useState("");
  const [savedLocationId, setSavedLocationId] = useState<string | null>(null);
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedExpansionIds, setSelectedExpansionIds] = useState<string[]>([]);

  // Initialize form with play data when dialog opens
  useEffect(() => {
    if (open && play) {
      // Convert play players to local format
      // Players without playerId are considered guests
      const playPlayers: Player[] = play.players.map((p, index) => ({
        id: p.id || String(index),
        name: p.name,
        playerId: p.playerId,
        isGuest: !p.playerId, // No playerId means guest
        isWinner: p.isWinner,
      }));
      setPlayers(playPlayers.length > 0 ? playPlayers : [{ id: "1", name: "", playerId: null, isGuest: false, isWinner: false }]);

      // Format date for input
      const date = new Date(play.playedAt);
      setPlayedAt(format(date, "yyyy-MM-dd"));

      setLocation(play.location || "");
      setSavedLocationId(play.savedLocationId || null);
      setDuration(play.duration ? String(play.duration) : "");
      setNotes(play.notes || "");
      
      // Initialize selected expansions from play data
      setSelectedExpansionIds(play.expansionsUsed?.map(e => e.id) || []);
    }
  }, [open, play]);

  const addPlayer = () => {
    const newId = String(Date.now());
    setPlayers([...players, { id: newId, name: "", playerId: null, isGuest: false, isWinner: false }]);
  };

  const removePlayer = (id: string) => {
    if (players.length > 1) {
      setPlayers(players.filter((p) => p.id !== id));
    }
  };

  const updatePlayer = (id: string, updates: Partial<Player>) => {
    setPlayers(players.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const handleSubmit = async () => {
    // Validation
    const validPlayers = players.filter((p) => p.name.trim() !== "");
    if (validPlayers.length === 0) {
      alert("Please add at least one player");
      return;
    }

    setSaving(true);
    try {
      // Process players - only create Player entities for non-guests without playerId
      const playersWithIds = await Promise.all(
        validPlayers.map(async (player) => {
          // If player already has an ID (linked to existing player), keep it
          if (player.playerId) {
            return {
              name: player.name.trim(),
              playerId: player.playerId,
              isWinner: player.isWinner,
            };
          }

          // If player is a guest, don't create a Player entity
          if (player.isGuest) {
            return {
              name: player.name.trim(),
              playerId: undefined,
              isWinner: player.isWinner,
            };
          }

          // Otherwise, create a new tracked player
          try {
            const response = await fetch("/api/players", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ displayName: player.name.trim() }),
            });

            if (response.ok) {
              const data = await response.json();
              return {
                name: data.player.displayName,
                playerId: data.player.id,
                isWinner: player.isWinner,
              };
            } else {
              // If creation fails, send without playerId
              return {
                name: player.name.trim(),
                playerId: undefined,
                isWinner: player.isWinner,
              };
            }
          } catch (error) {
            console.error("Failed to create player:", error);
            // If creation fails, send without playerId
            return {
              name: player.name.trim(),
              playerId: undefined,
              isWinner: player.isWinner,
            };
          }
        })
      );

      const response = await fetch(`/api/plays/${play.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playedAt: playedAt ? new Date(playedAt + "T12:00:00").toISOString() : undefined,
          location: location.trim() || null,
          savedLocationId: savedLocationId,
          duration: duration ? parseInt(duration, 10) : null,
          notes: notes.trim() || null,
          players: playersWithIds,
          expansionIds: selectedExpansionIds,
        }),
      });

      if (response.ok) {
        onOpenChange(false);
        if (onPlayUpdated) {
          onPlayUpdated();
        }
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update play");
      }
    } catch (error) {
      console.error("Failed to update play:", error);
      alert("Failed to update play");
    } finally {
      setSaving(false);
    }
  };

  const validPlayers = players.filter((p) => p.name.trim() !== "");
  const canSubmit = validPlayers.length > 0 && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Play - {play.game?.name || "Game"}</DialogTitle>
          <DialogDescription>
            Update your game session details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Players */}
          <div className="space-y-3">
            <Label className="text-base">Players *</Label>
            <div className="space-y-2">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30"
                >
                  <PlayerInput
                    value={player.name}
                    playerId={player.playerId}
                    isGuest={player.isGuest}
                    onChange={(name, playerId, isGuest) => updatePlayer(player.id, { name, playerId, isGuest })}
                    placeholder={`Player ${index + 1} name`}
                    className="flex-1"
                  />

                  {/* Winner toggle */}
                  <button
                    type="button"
                    onClick={() => updatePlayer(player.id, { isWinner: !player.isWinner })}
                    className={`p-2 rounded-md transition-colors ${
                      player.isWinner
                        ? "bg-amber-600 text-white"
                        : "bg-background hover:bg-accent"
                    }`}
                    title={player.isWinner ? "Winner" : "Mark as winner"}
                  >
                    <Trophy className="size-4" />
                  </button>

                  {/* Guest toggle - only show for players without a linked Player entity */}
                  {!player.playerId && (
                    <button
                      type="button"
                      onClick={() => updatePlayer(player.id, { isGuest: !player.isGuest })}
                      className={`p-2 rounded-md transition-colors ${
                        player.isGuest
                          ? "bg-stone-600 text-white"
                          : "bg-background hover:bg-accent"
                      }`}
                      title={player.isGuest ? "Guest (not tracked)" : "Mark as guest"}
                    >
                      <UserX className="size-4" />
                    </button>
                  )}

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removePlayer(player.id)}
                    disabled={players.length === 1}
                    className="p-2 rounded-md bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Remove player"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPlayer}
                className="w-full"
              >
                <Plus className="size-4 mr-2" />
                Add Player
              </Button>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="edit-played-at">Date</Label>
            <Input
              id="edit-played-at"
              type="date"
              value={playedAt}
              onChange={(e) => setPlayedAt(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Expansions Used */}
          {availableExpansions.length > 0 && (
            <ExpansionSelector
              availableExpansions={availableExpansions}
              selectedIds={selectedExpansionIds}
              onChange={setSelectedExpansionIds}
            />
          )}

          {/* Location */}
          <div className="space-y-2">
            <Label>Location (optional)</Label>
            <LocationInput
              value={location}
              savedLocationId={savedLocationId}
              onChange={(name, locId) => {
                setLocation(name);
                setSavedLocationId(locId ?? null);
              }}
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="edit-duration">Duration (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="edit-duration"
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="90"
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes (optional)</Label>
            <Input
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Great game! Close finish..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {saving ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
