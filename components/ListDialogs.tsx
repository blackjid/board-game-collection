"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Share2, Globe, Lock, LinkIcon, Copy, Check, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================================================
// Types
// ============================================================================

export interface ListData {
  id: string;
  name: string;
  slug?: string | null;
  description: string | null;
  isPublic?: boolean;
  shareToken?: string | null;
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
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setIsPublic(false);
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
          isPublic,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        onOpenChange(false);
        if (onCreated) {
          onCreated(data.collection);
        } else {
          // Default behavior: navigate to the new list using slug
          router.push(`/lists/${data.collection.slug}`);
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
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="create-public">Public</Label>
              <p className="text-xs text-muted-foreground">
                Allow anyone with the link to view this list
              </p>
            </div>
            <Switch
              id="create-public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
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
        // If the slug changed and we're on the list page, redirect to the new URL
        if (data.collection.slug && data.collection.slug !== list.slug) {
          router.push(`/lists/${data.collection.slug}`);
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

// ============================================================================
// Duplicate List Dialog
// ============================================================================

interface DuplicateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: ListData | null;
  onDuplicated?: (list: ListData) => void;
}

export function DuplicateListDialog({
  open,
  onOpenChange,
  list,
  onDuplicated,
}: DuplicateListDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [duplicating, setDuplicating] = useState(false);

  // Populate default name when list changes
  useEffect(() => {
    if (list) {
      setName(`${list.name} (Copy)`);
    }
  }, [list]);

  const handleDuplicate = async () => {
    if (!list || !name.trim()) return;
    setDuplicating(true);
    try {
      const response = await fetch(`/api/collections/${list.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (response.ok) {
        const data = await response.json();
        onOpenChange(false);
        if (onDuplicated) {
          onDuplicated(data.collection);
        } else {
          // Default behavior: navigate to the new list using slug
          router.push(`/lists/${data.collection.slug}`);
          router.refresh();
        }
      }
    } catch (error) {
      console.error("Failed to duplicate list:", error);
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate List</DialogTitle>
          <DialogDescription>
            Create a copy of &quot;{list?.name}&quot; with only games from your main collection.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="duplicate-name">New List Name</Label>
            <Input
              id="duplicate-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name for the duplicated list"
              onKeyDown={(e) => e.key === "Enter" && name.trim() && handleDuplicate()}
            />
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p>
              Only games that are currently in your main collection will be copied.
              Games added ad-hoc to this list will not be included.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={!name.trim() || duplicating}>
            {duplicating ? <Loader2 className="size-4 animate-spin" /> : "Duplicate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Share List Dialog
// ============================================================================

interface ShareListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: ListData | null;
  onUpdated?: () => void;
}

export function ShareListDialog({
  open,
  onOpenChange,
  list,
  onUpdated,
}: ShareListDialogProps) {
  const router = useRouter();
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync state when list changes or dialog opens
  useEffect(() => {
    if (list && open) {
      setShareToken(list.shareToken || null);
      setIsPublic(list.isPublic || false);
      setCopied(false);
    }
  }, [list, open]);

  const updateVisibility = async (newIsPublic: boolean) => {
    if (!list) return;
    setUpdatingVisibility(true);
    try {
      const response = await fetch(`/api/collections/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: newIsPublic }),
      });
      if (response.ok) {
        setIsPublic(newIsPublic);
        // Note: Don't refresh here - it will refresh when dialog closes
        // This prevents flickering as the useEffect would reset state with stale data
      } else {
        console.error("Failed to update visibility:", response.status);
      }
    } catch (error) {
      console.error("Failed to update visibility:", error);
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const generateShareToken = async () => {
    if (!list) return;
    setGeneratingToken(true);
    try {
      const response = await fetch(`/api/collections/${list.id}/share`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setShareToken(data.shareToken);
      } else {
        console.error("Failed to generate share token:", response.status);
      }
    } catch (error) {
      console.error("Failed to generate share token:", error);
    } finally {
      setGeneratingToken(false);
    }
  };

  const removeShareToken = async () => {
    if (!list) return;
    try {
      await fetch(`/api/collections/${list.id}/share`, {
        method: "DELETE",
      });
      setShareToken(null);
    } catch (error) {
      console.error("Failed to remove share token:", error);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // For both public and private lists with share token, use slug-based URLs
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const listSlug = list?.slug;
  
  // Public URL uses the slug
  const publicUrl = listSlug ? `${baseUrl}/lists/${listSlug}` : "";
  
  // Share URL adds the token as a query param
  const shareUrl = shareToken && listSlug
    ? `${baseUrl}/lists/${listSlug}?token=${shareToken}`
    : "";

  // Wrapper for onOpenChange to trigger refresh when closing
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Dialog is closing - refresh data
      if (onUpdated) onUpdated();
      router.refresh();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Share2 className="size-5 text-primary" />
            </div>
            Sharing Settings
          </DialogTitle>
          <DialogDescription>
            Manage access to &quot;{list?.name}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Visibility Toggle */}
          <div className="space-y-2">
            <Label htmlFor="visibility">List Visibility</Label>
            <Select
              value={isPublic ? "public" : "private"}
              onValueChange={(value) => updateVisibility(value === "public")}
              disabled={updatingVisibility}
            >
              <SelectTrigger id="visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="size-4" />
                    <span>Private - Only you and people with the link</span>
                  </div>
                </SelectItem>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe className="size-4" />
                    <span>Public - Anyone can view</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Public Mode */}
          {isPublic ? (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Globe className="size-4 text-emerald-500" />
                  <span className="text-sm font-medium">Public List</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  This list is visible to everyone. Anyone can access it without logging in.
                </p>
              </div>

              <div className="space-y-3">
                <Label>Public Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={publicUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" onClick={() => copyLink(publicUrl)}>
                    {copied ? (
                      <>
                        <Check className="size-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="size-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Private Mode */
            <div className="space-y-4">
              <div className="bg-amber-500/10 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="size-4 text-amber-500" />
                  <span className="text-sm font-medium">Private List</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  This list is private. Generate a secret link to share it with specific people.
                </p>
              </div>

              {shareToken ? (
                <div className="space-y-3">
                  <Label>Secret Share Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={shareUrl}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button variant="outline" onClick={() => copyLink(shareUrl)}>
                      {copied ? (
                        <>
                          <Check className="size-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="size-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Anyone with this link can view the list without logging in
                  </p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground text-sm mb-4">
                    No share link generated yet
                  </p>
                  <Button
                    onClick={generateShareToken}
                    disabled={generatingToken}
                    className="gap-2"
                  >
                    {generatingToken ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="size-4" />
                        Generate Share Link
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!isPublic && shareToken && (
            <Button
              variant="outline"
              onClick={removeShareToken}
              className="gap-2"
            >
              <Trash2 className="size-4" />
              Disable Share Link
            </Button>
          )}
          <Button onClick={() => handleOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
