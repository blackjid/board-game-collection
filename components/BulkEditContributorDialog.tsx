"use client";

import { useState, useEffect } from "react";

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
  ContributorSelector,
  type Contributor,
} from "@/components/ContributorSelector";

// ============================================================================
// Types
// ============================================================================

interface BulkEditContributorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameCount: number;
  onSave: (contributor: Contributor | null) => Promise<void>;
}

// ============================================================================
// Main Component
// ============================================================================

export function BulkEditContributorDialog({
  open,
  onOpenChange,
  gameCount,
  onSave,
}: BulkEditContributorDialogProps) {
  const [contributor, setContributor] = useState<Contributor | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setContributor(null);
    }
  }, [open]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(contributor);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save contributors:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Contributor</DialogTitle>
          <DialogDescription>
            Update the contributor for {gameCount} selected game{gameCount !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Contributor</Label>
            <ContributorSelector
              value={contributor}
              onChange={setContributor}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
