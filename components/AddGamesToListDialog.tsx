"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";

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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

type DialogStep = "select-games" | "confirm";

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
  const [step, setStep] = useState<DialogStep>("select-games");
  const [selectedGames, setSelectedGames] = useState<SelectedGame[]>([]);
  const [contributor, setContributor] = useState<Contributor | null>(null);
  const [showContributorSection, setShowContributorSection] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Track if we're transitioning to confirm step (to handle async state timing)
  const transitioningToConfirmRef = useRef(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep("select-games");
      setSelectedGames([]);
      setContributor(null);
      setShowContributorSection(false);
      transitioningToConfirmRef.current = false;
    }
  }, [open]);

  // Handle games selected from the selector
  const handleGamesSelected = (games: SelectedGame[]) => {
    if (games.length === 0) return;
    
    setSelectedGames(games);
    
    // If contributor option is available, show confirmation dialog
    // Otherwise, submit directly
    if (showContributor) {
      transitioningToConfirmRef.current = true;
      setStep("confirm");
    } else {
      submitGames(games, null);
    }
  };

  // Handle game selector trying to close
  const handleGameSelectorOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // If we're transitioning to confirmation step, don't close the parent
      if (transitioningToConfirmRef.current) {
        transitioningToConfirmRef.current = false;
        return;
      }
      // Otherwise, close the whole dialog
      onOpenChange(false);
    }
  };

  // Submit games to the API
  const submitGames = async (games: SelectedGame[], contrib: Contributor | null) => {
    setIsSubmitting(true);
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
            contributorId: contrib?.id ?? null,
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

  const handleConfirm = () => {
    submitGames(selectedGames, contributor);
  };

  const handleBack = () => {
    setStep("select-games");
  };

  // Show confirmation dialog with optional contributor
  if (step === "confirm" && showContributor) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Games to &quot;{listName}&quot;</DialogTitle>
            <DialogDescription>
              {selectedGames.length} game{selectedGames.length !== 1 ? "s" : ""} selected
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Selected games summary */}
            <div className="space-y-2">
              <Label>Selected Games</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-muted/50 p-2">
                <ul className="space-y-1 text-sm">
                  {selectedGames.map((game) => (
                    <li key={game.id} className="truncate">
                      {game.name}
                      {game.yearPublished && (
                        <span className="text-muted-foreground">
                          {" "}({game.yearPublished})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Optional contributor section */}
            <Collapsible
              open={showContributorSection}
              onOpenChange={setShowContributorSection}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex w-full justify-between px-0 hover:bg-transparent"
                >
                  <span className="text-sm text-muted-foreground">
                    {contributor
                      ? `Contributor: ${contributor.displayName}`
                      : "Set contributor (optional)"}
                  </span>
                  {showContributorSection ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <ContributorSelector
                  value={contributor}
                  onChange={setContributor}
                  className="w-full"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Who brought these games?
                </p>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
            <Button onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting
                ? "Adding..."
                : `Add ${selectedGames.length} Game${selectedGames.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show game selector dialog
  return (
    <GameSelectorDialog
      open={open && step === "select-games"}
      onOpenChange={handleGameSelectorOpenChange}
      mode="multi"
      title={`Add Games to "${listName}"`}
      description="Select games from your collection or search BoardGameGeek."
      existingGameIds={existingGameIds}
      onSelect={handleGamesSelected}
    />
  );
}
