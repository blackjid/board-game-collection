"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Library,
  FolderHeart,
  Plus,
  Menu,
  Loader2,
  Globe,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CollectionSummary } from "@/lib/games";

// ============================================================================
// Types
// ============================================================================

interface CollectionSidebarProps {
  collections: CollectionSummary[];
  selectedCollectionId: string | null;
  allGamesCount: number;
  isAdmin: boolean;
}

// ============================================================================
// Sidebar Content (shared between desktop and mobile)
// ============================================================================

interface SidebarContentProps {
  collections: CollectionSummary[];
  selectedCollectionId: string | null;
  allGamesCount: number;
  isAdmin: boolean;
  onCreateClick: () => void;
  onItemClick?: () => void;
}

function SidebarContent({
  collections,
  selectedCollectionId,
  allGamesCount,
  isAdmin,
  onCreateClick,
  onItemClick,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Library className="size-4" />
          Collections
        </h2>
      </div>

      {/* Scrollable list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* All Games - always first */}
          <Link
            href="/"
            onClick={onItemClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
              selectedCollectionId === null
                ? "bg-primary/10 text-primary"
                : "text-foreground hover:bg-muted"
            )}
          >
            <Library className="size-4 flex-shrink-0" />
            <span className="flex-1 font-medium truncate">All Games</span>
            <span className="text-xs text-muted-foreground">{allGamesCount}</span>
          </Link>

          {/* Divider */}
          {collections.length > 0 && (
            <div className="my-2 border-t border-border" />
          )}

          {/* Collections */}
          {collections.map((collection) => {
            const Icon = collection.type === "bgg_sync" ? Globe : FolderHeart;
            return (
              <Link
                key={collection.id}
                href={`/?collection=${collection.id}`}
                onClick={onItemClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  selectedCollectionId === collection.id
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <div className="relative flex-shrink-0">
                  <Icon className={cn(
                    "size-4",
                    collection.type === "bgg_sync" && "text-blue-500"
                  )} />
                  {collection.isPrimary && (
                    <Star className="size-2 absolute -top-1 -right-1 text-amber-500 fill-amber-500" />
                  )}
                </div>
                <span className="flex-1 font-medium truncate">{collection.name}</span>
                <span className="text-xs text-muted-foreground">{collection.gameCount}</span>
              </Link>
            );
          })}

          {/* Empty state */}
          {collections.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">
              No custom lists yet
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Footer - Create button for admins */}
      {isAdmin && (
        <div className="p-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={onCreateClick}
          >
            <Plus className="size-4" />
            New List
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CollectionSidebar({
  collections,
  selectedCollectionId,
  allGamesCount,
  isAdmin,
}: CollectionSidebarProps) {
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setShowCreateDialog(false);
        setFormName("");
        setFormDescription("");
        // Navigate to the new collection
        router.push(`/?collection=${data.collection.id}`);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to create collection:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-card/50 h-screen sticky top-0">
        <SidebarContent
          collections={collections}
          selectedCollectionId={selectedCollectionId}
          allGamesCount={allGamesCount}
          isAdmin={isAdmin}
          onCreateClick={() => setShowCreateDialog(true)}
        />
      </aside>

      {/* Create Collection Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
            <DialogDescription>
              Create a curated list of games for a specific purpose.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Vacation Games, Kids Favorites"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What is this list for?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formName.trim() || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// Mobile Trigger Component (for use in header)
// ============================================================================

export function CollectionSidebarMobileTrigger({
  collections,
  selectedCollectionId,
  allGamesCount,
  isAdmin,
}: CollectionSidebarProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setShowCreateDialog(false);
        setFormName("");
        setFormDescription("");
        router.push(`/?collection=${data.collection.id}`);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to create collection:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open collections menu"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Collections</SheetTitle>
          </SheetHeader>
          <SidebarContent
            collections={collections}
            selectedCollectionId={selectedCollectionId}
            allGamesCount={allGamesCount}
            isAdmin={isAdmin}
            onCreateClick={() => {
              setSheetOpen(false);
              setShowCreateDialog(true);
            }}
            onItemClick={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Create Collection Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
            <DialogDescription>
              Create a curated list of games for a specific purpose.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mobile-name">Name</Label>
              <Input
                id="mobile-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Vacation Games, Kids Favorites"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile-description">Description (optional)</Label>
              <Input
                id="mobile-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What is this list for?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formName.trim() || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
