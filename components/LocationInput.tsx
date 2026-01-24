"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Check, ChevronsUpDown, MapPin, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SavedLocationData } from "@/types/play";

// ============================================================================
// Types
// ============================================================================

interface LocationInputProps {
  value: string;
  savedLocationId?: string | null;
  onChange: (locationName: string, savedLocationId?: string | null) => void;
  className?: string;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

// Radius in meters to consider a location as "nearby"
const NEARBY_RADIUS_METERS = 200;

/**
 * Calculate distance between two coordinates using the Haversine formula
 * @returns Distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find the nearest saved location within a given radius
 */
function findNearbyLocation(
  coords: Coordinates,
  locations: SavedLocationData[],
  radiusMeters: number
): SavedLocationData | null {
  let nearestLocation: SavedLocationData | null = null;
  let nearestDistance = Infinity;

  for (const location of locations) {
    const distance = calculateDistance(
      coords.latitude,
      coords.longitude,
      location.latitude,
      location.longitude
    );
    if (distance <= radiusMeters && distance < nearestDistance) {
      nearestDistance = distance;
      nearestLocation = location;
    }
  }

  return nearestLocation;
}

// ============================================================================
// Location Input Component
// ============================================================================

export function LocationInput({
  value,
  savedLocationId,
  onChange,
  className,
}: LocationInputProps) {
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<SavedLocationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoDetectAttempted, setAutoDetectAttempted] = useState(false);

  // Location capture state
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<Coordinates | null>(null);
  const [newLocationName, setNewLocationName] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);

  // Use ref to avoid onChange in dependency array (it may change on every render)
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Stable callback for auto-detection
  const autoSelectLocation = useCallback((location: SavedLocationData) => {
    onChangeRef.current(location.name, location.id);
  }, []);

  // Load saved locations on mount
  useEffect(() => {
    loadLocations();
  }, []);

  // Auto-detect nearby location when locations are loaded
  useEffect(() => {
    // Only attempt once, and only if no location is already selected
    if (autoDetectAttempted || savedLocationId || value || locations.length === 0) {
      return;
    }

    setAutoDetectAttempted(true);

    // Check if geolocation is available
    if (!navigator.geolocation) {
      return;
    }

    // Try to get current location with a short timeout (don't block the UI)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        const nearbyLocation = findNearbyLocation(coords, locations, NEARBY_RADIUS_METERS);
        if (nearbyLocation) {
          // Auto-fill with the nearby location
          autoSelectLocation(nearbyLocation);
        }
      },
      () => {
        // Silently fail - user may not have granted permission yet
      },
      {
        enableHighAccuracy: false, // Use cached/quick location for auto-detect
        timeout: 5000,
        maximumAge: 60000, // Accept cached location up to 1 minute old
      }
    );
  }, [locations, autoDetectAttempted, savedLocationId, value, autoSelectLocation]);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/locations");
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error("Failed to load locations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle selecting an existing location
  const handleSelectLocation = (location: SavedLocationData) => {
    onChange(location.name, location.id);
    setOpen(false);
  };

  // Handle clearing location
  const handleClear = () => {
    onChange("", null);
    setOpen(false);
  };

  // Handle manual text input (no saved location reference)
  const handleManualInput = (name: string) => {
    onChange(name, null);
  };

  // Get current location using browser's location services
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPendingCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setNewLocationName("");
        setShowSaveDialog(true);
        setGettingLocation(false);
      },
      (error) => {
        setGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert("Location permission denied. Please enable location access in your browser settings.");
            break;
          case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            alert("Location request timed out.");
            break;
          default:
            alert("An error occurred while getting your location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Save new location
  const handleSaveLocation = async () => {
    if (!pendingCoords || !newLocationName.trim()) return;

    setSavingLocation(true);
    try {
      const response = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLocationName.trim(),
          latitude: pendingCoords.latitude,
          longitude: pendingCoords.longitude,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh locations list
        await loadLocations();
        // Select the new location
        onChange(data.location.name, data.location.id);
        setShowSaveDialog(false);
        setPendingCoords(null);
        setNewLocationName("");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save location");
      }
    } catch (error) {
      console.error("Failed to save location:", error);
      alert("Failed to save location");
    } finally {
      setSavingLocation(false);
    }
  };

  // Get the selected location object
  const selectedLocation = savedLocationId
    ? locations.find((l) => l.id === savedLocationId)
    : null;

  return (
    <>
      <div className={cn("flex gap-2", className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between font-normal"
            >
              <span className={cn("flex items-center gap-2", !value && "text-muted-foreground")}>
                {selectedLocation && <MapPin className="size-3 text-muted-foreground" />}
                {value || "Select or enter location..."}
              </span>
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Enter location name..."
                value={value}
                onValueChange={handleManualInput}
              />
              <CommandList>
                {loading && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Loading locations...
                  </div>
                )}
                {!loading && locations.length === 0 && (
                  <CommandEmpty>
                    No saved locations yet.
                    <br />
                    <span className="text-muted-foreground">
                      Tap the pin icon to save your current location.
                    </span>
                  </CommandEmpty>
                )}
                {!loading && locations.length > 0 && (
                  <CommandGroup heading="Saved Locations">
                    {locations.map((location) => (
                      <CommandItem
                        key={location.id}
                        value={location.id}
                        onSelect={() => handleSelectLocation(location)}
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4",
                            savedLocationId === location.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <MapPin className="mr-2 size-4 text-muted-foreground" />
                        <span>{location.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {value && (
                  <CommandGroup heading="">
                    <CommandItem onSelect={handleClear}>
                      <X className="mr-2 size-4" />
                      Clear location
                    </CommandItem>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Location Button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={getCurrentLocation}
          disabled={gettingLocation}
          title="Use current location"
        >
          {gettingLocation ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MapPin className="size-4" />
          )}
        </Button>
      </div>

      {/* Save Location Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Location</DialogTitle>
            <DialogDescription>
              Give this location a name so you can easily select it next time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="location-name">Location Name</Label>
              <Input
                id="location-name"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="e.g., Home, Game Store, Friend's House"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowSaveDialog(false);
                setPendingCoords(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveLocation}
              disabled={!newLocationName.trim() || savingLocation}
            >
              {savingLocation ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Location"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
