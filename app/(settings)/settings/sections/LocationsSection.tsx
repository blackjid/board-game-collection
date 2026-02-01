"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Edit, MapPinPlus, MoreVertical, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { useRowSelection } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";
import { MapPicker } from "@/components/MapPicker";
import type { SavedLocationData } from "@/types/play";

export function LocationsSection() {
  const [locations, setLocations] = useState<SavedLocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<SavedLocationData | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Row selection for bulk actions
  const {
    selectedCount,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    allSelected,
    someSelected,
    selectedItems,
  } = useRowSelection({
    items: locations,
    getItemId: (location) => location.id,
  });

  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch("/api/locations");
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations);
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleOpenModal = (location?: SavedLocationData) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
      });
    } else {
      setEditingLocation(null);
      setFormData({ name: "", latitude: null, longitude: null });
    }
    setError("");
    setShowLocationModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    if (formData.latitude === null || formData.longitude === null) {
      setError("Please select a location on the map");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingLocation) {
        const response = await fetch(`/api/locations/${editingLocation.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            latitude: formData.latitude,
            longitude: formData.longitude,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to update location");
          return;
        }
      } else {
        const response = await fetch("/api/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            latitude: formData.latitude,
            longitude: formData.longitude,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to create location");
          return;
        }
      }

      await fetchLocations();
      setShowLocationModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (locationId: string) => {
    if (!confirm("Are you sure you want to delete this location?")) return;

    const response = await fetch(`/api/locations/${locationId}`, { method: "DELETE" });
    if (response.ok) {
      await fetchLocations();
    } else {
      const data = await response.json();
      alert(data.error || "Failed to delete location");
    }
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCount} location(s)?`)) return;

    await Promise.all(
      selectedItems.map((location) =>
        fetch(`/api/locations/${location.id}`, { method: "DELETE" })
      )
    );
    clearSelection();
    await fetchLocations();
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading locations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Locations</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage saved locations for play logging
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <MapPinPlus className="size-4" />
          Add Location
        </Button>
      </div>

      <Card className="gap-0">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg">{locations.length} Locations</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {/* Select All Header with Bulk Actions */}
          {locations.length > 0 && (
            <div className={cn(
              "px-3 sm:px-4 h-12 border-b border-border flex items-center gap-3 sm:gap-4",
              selectedCount > 0 ? "bg-primary/10" : "bg-muted/30"
            )}>
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all"
                {...(someSelected ? { "data-state": "indeterminate" } : {})}
              />
              <span className="text-xs text-muted-foreground flex-1">
                {selectedCount > 0
                  ? `${selectedCount} location${selectedCount !== 1 ? "s" : ""} selected`
                  : allSelected ? "Deselect all" : "Select all"}
              </span>
              {selectedCount > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="size-4" />
                    Delete Selected
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="divide-y divide-border">
            {locations.map((location) => {
              // Actions component for both context menu and dropdown
              const LocationActions = ({ asContext = false }: { asContext?: boolean }) => {
                const MenuItem = asContext ? ContextMenuItem : DropdownMenuItem;
                const MenuSeparator = asContext ? ContextMenuSeparator : DropdownMenuSeparator;

                return (
                  <>
                    <MenuItem onClick={() => handleOpenModal(location)}>
                      <Edit className="size-4" />
                      Edit
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(location.id)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </MenuItem>
                  </>
                );
              };

              return (
                <ContextMenu key={location.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      className={cn(
                        "p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:bg-muted/50 transition-colors cursor-default",
                        isSelected(location.id) && "bg-primary/5"
                      )}
                    >
                      {/* Checkbox */}
                      <Checkbox
                        checked={isSelected(location.id)}
                        onCheckedChange={() => toggleItem(location.id)}
                        aria-label={`Select ${location.name}`}
                      />

                      <div className="size-10 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="size-5 text-secondary-foreground" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground truncate text-sm sm:text-base">
                            {location.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="truncate">
                            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      {/* Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                            <MoreVertical className="size-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <LocationActions />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <LocationActions asContext />
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
            {locations.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No locations saved yet. Add your first location to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location Modal */}
      <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? "Edit Location" : "Add Location"}
            </DialogTitle>
            <DialogDescription>
              {editingLocation
                ? "Update the location name or position"
                : "Add a new location by clicking on the map or using your current location"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="locationName">Name *</Label>
              <Input
                id="locationName"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Home, Game Store, Coffee Shop"
              />
            </div>

            <div className="space-y-2">
              <Label>Location *</Label>
              <MapPicker
                latitude={formData.latitude}
                longitude={formData.longitude}
                onLocationSelect={handleLocationSelect}
                height="350px"
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowLocationModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingLocation ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
