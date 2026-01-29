"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";

import {
  GameSelectorDialog,
  type SelectedGame,
} from "@/components/GameSelectorDialog";
import {
  ContributorSelector,
  type Contributor,
} from "@/components/ContributorSelector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// ============================================================================
// Types
// ============================================================================

interface AddGamesToListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  listName: string;
  /** IDs of games already in this list */
  existingGameIds: Set<string>;
  /** Whether to show contributor selection (for manual lists only) */
  showContributor?: boolean;
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
  showContributor = false,
  onGamesAdded,
}: AddGamesToListDialogProps) {
  const router = useRouter();
  const [selectedGames, setSelectedGames] = useState<SelectedGame[]>([]);
  const [contributor, setContributor] = useState<Contributor | null>(null);
  const [showGameSelector, setShowGameSelector] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedGames([]);
      setContributor(null);
      // If not showing contributor, go straight to game selector
      if (!showContributor) {
        setShowGameSelector(true);
      }
    } else {
      setShowGameSelector(false);
    }
  }, [open, showContributor]);

  const handleGamesSelected = (games: SelectedGame[]) => {
    setSelectedGames(games);
    setShowGameSelector(false);
  };

  const handleSubmit = async () => {
    if (selectedGames.length === 0) return;

    setIsSubmitting(true);
    try {
      // Add each selected game to the collection
      const promises = selectedGames.map(async (game) => {
        await fetch(`/api/collections/${listId}/games`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: game.id,
            name: game.name,
            yearPublished: game.yearPublished,
            isExpansion: game.isExpansion,
            contributorId: contributor?.id ?? null,
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
      setIsSubmitting(false);
    }
  };

  // Direct mode: no contributor selection, go straight to game selector
  const handleDirectSelect = async (games: SelectedGame[]) => {
    if (games.length === 0) return;

    try {
      const promises = games.map(async (game) => {
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

      if (onGamesAdded) {
        onGamesAdded();
      }
      router.refresh();
    } catch (error) {
      console.error("Failed to add games:", error);
    }
  };

  // If not showing contributor, use the simple flow
  if (!showContributor) {
    return (
      <GameSelectorDialog
        open={open}
        onOpenChange={onOpenChange}
        mode="multi"
        title={`Add Games to "${listName}"`}
        description="Select games from your collection or search BoardGameGeek."
        existingGameIds={existingGameIds}
        onSelect={handleDirectSelect}
      />
    );
  }

  // Show game selector dialog
  if (showGameSelector) {
    return (
      <GameSelectorDialog
        open={showGameSelector}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            // User cancelled game selection
            if (selectedGames.length === 0) {
              onOpenChange(false);
            } else {
              setShowGameSelector(false);
            }
          }
        }}
        mode="multi"
        title={`Add Games to "${listName}"`}
        description="Select games from your collection or search BoardGameGeek."
        existingGameIds={existingGameIds}
        onSelect={handleGamesSelected}
      />
    );
  }

  // Show contributor selection + confirmation dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Games to &quot;{listName}&quot;</DialogTitle>
          <DialogDescription>
            Set who is contributing these games, then select the games.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Contributor selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="size-4" />
              Contributor
            </Label>
            <ContributorSelector
              value={contributor}
              onChange={setContributor}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Who is contributing these games to the list?
            </p>
          </div>

          {/* Selected games summary */}
          {selectedGames.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Games ({selectedGames.length})</Label>
              <div className="max-h-32 overflow-y-auto rounded-md border border-border bg-muted/50 p-2">
                <ul className="space-y-1 text-sm">
                  {selectedGames.map((game) => (
                    <li key={game.id} className="truncate">
                      {game.name}
                      {game.yearPublished && (
                        <span className="text-muted-foreground">
                          {" "}
                          ({game.yearPublished})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {selectedGames.length === 0 ? (
            <Button onClick={() => setShowGameSelector(true)}>
              Select Games
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => setShowGameSelector(true)}
              >
                Change Games
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting
                  ? "Adding..."
                  : `Add ${selectedGames.length} Game${selectedGames.length !== 1 ? "s" : ""}`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
