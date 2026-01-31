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

interface EditContributorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameName: string;
  currentContributor: Contributor | null;
  onSave: (contributor: Contributor | null) => Promise<void>;
}

// ============================================================================
// Main Component
// ============================================================================

export function EditContributorDialog({
  open,
  onOpenChange,
  gameName,
  currentContributor,
  onSave,
}: EditContributorDialogProps) {
  const [contributor, setContributor] = useState<Contributor | null>(
    currentContributor
  );
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setContributor(currentContributor);
    }
  }, [open, currentContributor]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(contributor);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save contributor:", error);
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
            Update who contributed &quot;{gameName}&quot; to this list.
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
