"use client";

import { useRouter } from "next/navigation";

import { GameSelectorDialog, type SelectedGame } from "@/components/GameSelectorDialog";

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

  const handleSelect = async (games: SelectedGame[]) => {
    if (games.length === 0) return;

    try {
      // Add each selected game to the collection
      const promises = games.map(async (game) => {
        // If game is from BGG, it's already been created by GameSelectorDialog
        // Just add it to the collection
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

  return (
    <GameSelectorDialog
      open={open}
      onOpenChange={onOpenChange}
      mode="multi"
      title={`Add Games to "${listName}"`}
      description="Select games from your collection or search BoardGameGeek."
      existingGameIds={existingGameIds}
      onSelect={handleSelect}
    />
  );
}
