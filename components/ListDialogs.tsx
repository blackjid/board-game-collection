"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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

// ============================================================================
// Types
// ============================================================================

export interface ListData {
  id: string;
  name: string;
  description: string | null;
}

// ============================================================================
// Create List Dialog
// ============================================================================

interface CreateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (list: ListData) => void;
}

export function CreateListDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateListDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
    }
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        onOpenChange(false);
        if (onCreated) {
          onCreated(data.collection);
        } else {
          // Default behavior: navigate to the new list
          router.push(`/?collection=${data.collection.id}`);
          router.refresh();
        }
      }
    } catch (error) {
      console.error("Failed to create list:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New List</DialogTitle>
          <DialogDescription>
            Create a curated list of games for a specific purpose.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="create-name">Name</Label>
            <Input
              id="create-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Vacation Games, Kids Favorites"
              onKeyDown={(e) => e.key === "Enter" && name.trim() && handleCreate()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-description">Description (optional)</Label>
            <Input
              id="create-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this list for?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Edit List Dialog
// ============================================================================

interface EditListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: ListData | null;
  onUpdated?: (list: ListData) => void;
}

export function EditListDialog({
  open,
  onOpenChange,
  list,
  onUpdated,
}: EditListDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Populate form when list changes
  useEffect(() => {
    if (list) {
      setName(list.name);
      setDescription(list.description || "");
    }
  }, [list]);

  const handleSave = async () => {
    if (!list || !name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/collections/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        onOpenChange(false);
        if (onUpdated) {
          onUpdated(data.collection);
        }
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update list:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit List</DialogTitle>
          <DialogDescription>
            Update the details of this list.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && handleSave()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description (optional)</Label>
            <Input
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Delete List Dialog
// ============================================================================

interface DeleteListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: ListData | null;
  onDeleted?: () => void;
}

export function DeleteListDialog({
  open,
  onOpenChange,
  list,
  onDeleted,
}: DeleteListDialogProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!list) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/collections/${list.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        onOpenChange(false);
        if (onDeleted) {
          onDeleted();
        } else {
          // Default behavior: navigate to home
          router.push("/");
          router.refresh();
        }
      }
    } catch (error) {
      console.error("Failed to delete list:", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete List</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{list?.name}&quot;? This action
            cannot be undone. The games themselves will not be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
