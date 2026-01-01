"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Plus,
  Trash2,
  Edit2,
  Play,
  Search,
  X,
  ArrowLeft,
  MoreVertical,
  ImageIcon,
  FolderHeart,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface CollectionSummary {
  id: string;
  name: string;
  description: string | null;
  gameCount: number;
  createdAt: string;
  updatedAt: string;
  previewImages: string[];
}

interface GameInCollection {
  id: string;
  name: string;
  yearPublished: number | null;
  image: string | null;
  thumbnail: string | null;
  rating: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  isExpansion: boolean;
  lastScraped: string | null;
  addedAt: string;
}

interface CollectionDetail {
  id: string;
  name: string;
  description: string | null;
  gameCount: number;
  createdAt: string;
  updatedAt: string;
  games: GameInCollection[];
}

// ============================================================================
// Collection List View
// ============================================================================

interface CollectionListProps {
  collections: CollectionSummary[];
  loading: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit: (collection: CollectionSummary) => void;
  onDelete: (collection: CollectionSummary) => void;
}

function CollectionList({
  collections,
  loading,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
}: CollectionListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderHeart className="size-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No lists yet</h3>
        <p className="text-muted-foreground text-sm mb-6">
          Create a list to curate games for trips, events, or specific groups.
        </p>
        <Button onClick={onCreate}>
          <Plus className="size-4" />
          Create Your First List
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {collections.map((collection) => (
        <Card
          key={collection.id}
          className="group cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => onSelect(collection.id)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">{collection.name}</CardTitle>
                {collection.description && (
                  <CardDescription className="line-clamp-2 mt-1">
                    {collection.description}
                  </CardDescription>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(collection); }}>
                    <Edit2 className="size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onDelete(collection); }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            {/* Preview images grid */}
            <div className="grid grid-cols-4 gap-1 mb-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded bg-muted overflow-hidden"
                >
                  {collection.previewImages[i] ? (
                    <Image
                      src={collection.previewImages[i]}
                      alt=""
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="size-4 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{collection.gameCount} game{collection.gameCount !== 1 ? "s" : ""}</span>
              <span>Updated {new Date(collection.updatedAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// Collection Detail View
// ============================================================================

interface CollectionDetailViewProps {
  collection: CollectionDetail;
  onBack: () => void;
  onAddGames: () => void;
  onRemoveGame: (gameId: string) => void;
  onStartPicker: () => void;
  removingGameId: string | null;
}

function CollectionDetailView({
  collection,
  onBack,
  onAddGames,
  onRemoveGame,
  onStartPicker,
  removingGameId,
}: CollectionDetailViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-foreground">{collection.name}</h2>
            {collection.description && (
              <p className="text-muted-foreground text-sm">{collection.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-10 sm:ml-0">
          <Button variant="secondary" onClick={onAddGames}>
            <Search className="size-4" />
            Add Games
          </Button>
          <Button
            onClick={onStartPicker}
            disabled={collection.games.length === 0}
          >
            <Play className="size-4" />
            Start Picker
          </Button>
        </div>
      </div>

      {/* Games list */}
      <Card className="gap-0">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg">
            Games ({collection.games.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {collection.games.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <ImageIcon className="size-10 mx-auto mb-3 text-muted-foreground/50" />
              <p>No games in this list yet.</p>
              <p className="text-sm mt-1">Add games from your collection or search BGG.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {collection.games.map((game) => (
                <div
                  key={game.id}
                  className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:bg-muted/50 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
                    {game.image || game.thumbnail ? (
                      <Image
                        src={game.image || game.thumbnail || ""}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="size-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Game info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground truncate text-sm sm:text-base">
                        {game.name}
                      </h4>
                      {game.isExpansion && (
                        <Badge variant="secondary" className="text-[10px]">Exp</Badge>
                      )}
                      {!game.lastScraped && (
                        <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/50">
                          Pending
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {game.yearPublished && <span>{game.yearPublished}</span>}
                      {game.rating && (
                        <span className="text-primary">★ {game.rating.toFixed(1)}</span>
                      )}
                      {game.minPlayers && game.maxPlayers && (
                        <span>{game.minPlayers}-{game.maxPlayers} players</span>
                      )}
                    </div>
                  </div>

                  {/* Remove button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveGame(game.id)}
                    disabled={removingGameId === game.id}
                  >
                    {removingGameId === game.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <X className="size-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CollectionsSection() {
  const router = useRouter();
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collectionDetail, setCollectionDetail] = useState<CollectionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddGamesDialog, setShowAddGamesDialog] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CollectionSummary | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingGameId, setRemovingGameId] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    name: string;
    yearPublished: number | null;
    thumbnail: string | null;
    isInMainCollection: boolean;
    isExpansion: boolean;
  }>>([]);
  const [searching, setSearching] = useState(false);
  const [addingGameId, setAddingGameId] = useState<string | null>(null);

  // Fetch collections list
  const fetchCollections = useCallback(async () => {
    try {
      const response = await fetch("/api/collections");
      if (response.ok) {
        const data = await response.json();
        setCollections(data.collections);
      }
    } catch (error) {
      console.error("Failed to fetch collections:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch single collection detail
  const fetchCollectionDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/collections/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCollectionDetail(data.collection);
      }
    } catch (error) {
      console.error("Failed to fetch collection detail:", error);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    if (selectedCollectionId) {
      fetchCollectionDetail(selectedCollectionId);
    } else {
      setCollectionDetail(null);
    }
  }, [selectedCollectionId, fetchCollectionDetail]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), description: formDescription.trim() || null }),
      });
      if (response.ok) {
        const data = await response.json();
        setCollections([data.collection, ...collections]);
        setShowCreateDialog(false);
        setFormName("");
        setFormDescription("");
        // Open the new collection
        setSelectedCollectionId(data.collection.id);
      }
    } catch (error) {
      console.error("Failed to create collection:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingCollection || !formName.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/collections/${editingCollection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), description: formDescription.trim() || null }),
      });
      if (response.ok) {
        const data = await response.json();
        setCollections(collections.map((c) =>
          c.id === editingCollection.id ? { ...c, ...data.collection } : c
        ));
        if (collectionDetail?.id === editingCollection.id) {
          setCollectionDetail({ ...collectionDetail, name: formName.trim(), description: formDescription.trim() || null });
        }
        setShowEditDialog(false);
        setEditingCollection(null);
        setFormName("");
        setFormDescription("");
      }
    } catch (error) {
      console.error("Failed to update collection:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingCollection) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/collections/${editingCollection.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setCollections(collections.filter((c) => c.id !== editingCollection.id));
        if (selectedCollectionId === editingCollection.id) {
          setSelectedCollectionId(null);
        }
        setShowDeleteDialog(false);
        setEditingCollection(null);
      }
    } catch (error) {
      console.error("Failed to delete collection:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveGame = async (gameId: string) => {
    if (!collectionDetail) return;
    setRemovingGameId(gameId);
    try {
      const response = await fetch(`/api/collections/${collectionDetail.id}/games`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });
      if (response.ok) {
        setCollectionDetail({
          ...collectionDetail,
          games: collectionDetail.games.filter((g) => g.id !== gameId),
          gameCount: collectionDetail.gameCount - 1,
        });
        // Also update the list summary
        setCollections(collections.map((c) =>
          c.id === collectionDetail.id ? { ...c, gameCount: c.gameCount - 1 } : c
        ));
      }
    } catch (error) {
      console.error("Failed to remove game:", error);
    } finally {
      setRemovingGameId(null);
    }
  };

  // Search BGG
  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    try {
      const response = await fetch(`/api/bgg/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results);
      }
    } catch (error) {
      console.error("Failed to search BGG:", error);
    } finally {
      setSearching(false);
    }
  };

  // Add game to collection
  const handleAddGame = async (game: {
    id: string;
    name: string;
    yearPublished: number | null;
    isExpansion: boolean;
  }) => {
    if (!collectionDetail) return;
    setAddingGameId(game.id);
    try {
      const response = await fetch(`/api/collections/${collectionDetail.id}/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          name: game.name,
          yearPublished: game.yearPublished,
          isExpansion: game.isExpansion,
        }),
      });
      if (response.ok) {
        // Refresh the collection detail
        await fetchCollectionDetail(collectionDetail.id);
        // Update the list summary
        setCollections(collections.map((c) =>
          c.id === collectionDetail.id ? { ...c, gameCount: c.gameCount + 1 } : c
        ));
      }
    } catch (error) {
      console.error("Failed to add game:", error);
    } finally {
      setAddingGameId(null);
    }
  };

  const handleStartPicker = () => {
    if (collectionDetail) {
      router.push(`/pick/collection/${collectionDetail.id}`);
    }
  };

  const openEditDialog = (collection: CollectionSummary) => {
    setEditingCollection(collection);
    setFormName(collection.name);
    setFormDescription(collection.description || "");
    setShowEditDialog(true);
  };

  const openDeleteDialog = (collection: CollectionSummary) => {
    setEditingCollection(collection);
    setShowDeleteDialog(true);
  };

  const openAddGamesDialog = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowAddGamesDialog(true);
  };

  // Check if game is already in current collection
  const isGameInCollection = (gameId: string) => {
    return collectionDetail?.games.some((g) => g.id === gameId) || false;
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      {!selectedCollectionId && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Game Lists</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Create curated lists for trips, events, or groups
            </p>
          </div>
          <Button onClick={() => { setFormName(""); setFormDescription(""); setShowCreateDialog(true); }}>
            <Plus className="size-4" />
            New List
          </Button>
        </div>
      )}

      {/* Content */}
      {selectedCollectionId && collectionDetail ? (
        <CollectionDetailView
          collection={collectionDetail}
          onBack={() => { setSelectedCollectionId(null); fetchCollections(); }}
          onAddGames={openAddGamesDialog}
          onRemoveGame={handleRemoveGame}
          onStartPicker={handleStartPicker}
          removingGameId={removingGameId}
        />
      ) : selectedCollectionId && detailLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <CollectionList
          collections={collections}
          loading={loading}
          onSelect={setSelectedCollectionId}
          onCreate={() => { setFormName(""); setFormDescription(""); setShowCreateDialog(true); }}
          onEdit={openEditDialog}
          onDelete={openDeleteDialog}
        />
      )}

      {/* Create Dialog */}
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
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formName.trim() || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Input
                id="edit-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!formName.trim() || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete List</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{editingCollection?.name}&quot;? This action cannot be undone.
              The games themselves will not be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Games Dialog */}
      <Dialog open={showAddGamesDialog} onOpenChange={setShowAddGamesDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Games to List</DialogTitle>
            <DialogDescription>
              Search BoardGameGeek to add games to this list.
            </DialogDescription>
          </DialogHeader>

          {/* Search input */}
          <div className="flex gap-2 py-2">
            <Input
              placeholder="Search games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searchQuery.length < 2 || searching}>
              {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            </Button>
          </div>

          {/* Search results */}
          <div className="flex-1 overflow-y-auto min-h-[200px] border rounded-lg">
            {searchResults.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                {searching ? "Searching..." : "Search for games to add"}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {searchResults.map((game) => {
                  const inCollection = isGameInCollection(game.id);
                  return (
                    <div
                      key={game.id}
                      className={cn(
                        "p-3 flex items-center gap-3",
                        inCollection && "opacity-50"
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                        {game.thumbnail ? (
                          <Image
                            src={game.thumbnail}
                            alt=""
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="size-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{game.name}</span>
                          {game.isExpansion && (
                            <Badge variant="secondary" className="text-[10px]">Exp</Badge>
                          )}
                          {game.isInMainCollection && (
                            <Badge variant="outline" className="text-[10px]">Owned</Badge>
                          )}
                        </div>
                        {game.yearPublished && (
                          <span className="text-xs text-muted-foreground">{game.yearPublished}</span>
                        )}
                      </div>

                      {/* Add button */}
                      <Button
                        size="sm"
                        variant={inCollection ? "ghost" : "secondary"}
                        onClick={() => !inCollection && handleAddGame(game)}
                        disabled={inCollection || addingGameId === game.id}
                      >
                        {addingGameId === game.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : inCollection ? (
                          "Added"
                        ) : (
                          <>
                            <Plus className="size-4" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddGamesDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
