"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { MapPin, Crosshair, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LeafletMouseEvent, Map as LeafletMap, Icon } from "leaflet";

// Dynamically import react-leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

// ============================================================================
// Types
// ============================================================================

export interface MapPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
  height?: string;
}

// ============================================================================
// Inner Map Component (rendered only on client)
// ============================================================================

function MapInner({
  position,
  defaultCenter,
  defaultZoom,
  onLocationSelect,
  mapRef,
}: {
  position: [number, number] | null;
  defaultCenter: [number, number];
  defaultZoom: number;
  onLocationSelect: (lat: number, lng: number) => void;
  mapRef: React.MutableRefObject<LeafletMap | null>;
}) {
  const [MarkerComponent, setMarkerComponent] = useState<React.ComponentType<{
    position: [number, number];
    icon?: Icon;
  }> | null>(null);
  const [customIcon, setCustomIcon] = useState<Icon | null>(null);
  const [MapEventsComponent, setMapEventsComponent] = useState<React.ComponentType | null>(null);

  // Store onLocationSelect in a ref to avoid re-creating MapEventsComponent
  const onLocationSelectRef = useRef(onLocationSelect);
  onLocationSelectRef.current = onLocationSelect;

  useEffect(() => {
    // Import Leaflet CSS
    import("leaflet/dist/leaflet.css");

    // Import Marker component and create custom icon
    import("react-leaflet").then((mod) => {
      setMarkerComponent(() => mod.Marker as React.ComponentType<{
        position: [number, number];
        icon?: Icon;
      }>);

      // Create the map events component
      const EventsHandler = () => {
        mod.useMapEvents({
          click: (e: LeafletMouseEvent) => {
            onLocationSelectRef.current(e.latlng.lat, e.latlng.lng);
          },
        });
        return null;
      };
      setMapEventsComponent(() => EventsHandler);
    });

    import("leaflet").then((L) => {
      // Fix for default marker icon in webpack
      const icon = new L.Icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      setCustomIcon(icon);
    });
  }, []);

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: "100%", width: "100%" }}
      ref={(map) => {
        if (map) {
          mapRef.current = map;
        }
      }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {MapEventsComponent && <MapEventsComponent />}
      {position && MarkerComponent && customIcon && (
        <MarkerComponent position={position} icon={customIcon} />
      )}
    </MapContainer>
  );
}

// ============================================================================
// Helper to compute initial position
// ============================================================================

function getInitialPosition(
  latitude?: number | null,
  longitude?: number | null
): [number, number] | null {
  if (latitude != null && longitude != null) {
    return [latitude, longitude];
  }
  return null;
}

// ============================================================================
// Main MapPicker Component
// ============================================================================

export function MapPicker({
  latitude,
  longitude,
  onLocationSelect,
  height = "300px",
}: MapPickerProps) {
  // Initialize with props - use lazy initialization
  const [position, setPosition] = useState<[number, number] | null>(() =>
    getInitialPosition(latitude, longitude)
  );
  const [mounted, setMounted] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  // Default center (if no position): roughly center of world
  const defaultCenter: [number, number] = position || [20, 0];
  const defaultZoom = position ? 15 : 2;

  useEffect(() => {
    // Use requestAnimationFrame to defer the state update
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Sync with external prop changes using effect (with proper deps)
  // This is a valid pattern for controlled components - props drive state
  useEffect(() => {
    const newPosition = getInitialPosition(latitude, longitude);
    if (newPosition) {
      // Only update if the position actually changed
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPosition((prev) => {
        if (!prev || prev[0] !== newPosition[0] || prev[1] !== newPosition[1]) {
          return newPosition;
        }
        return prev;
      });
    }
  }, [latitude, longitude]);

  const handleLocationSelect = useCallback(
    (lat: number, lng: number) => {
      setPosition([lat, lng]);
      onLocationSelect(lat, lng);
    },
    [onLocationSelect]
  );

  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        handleLocationSelect(lat, lng);

        // Pan map to new location
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 15);
        }
        setGettingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to get your location. Please select on the map.");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [handleLocationSelect]);

  if (!mounted) {
    return (
      <div
        className="bg-muted rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Click on the map to select a location
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGetCurrentLocation}
          disabled={gettingLocation}
        >
          {gettingLocation ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Crosshair className="size-4" />
          )}
          Use My Location
        </Button>
      </div>

      <div className="rounded-lg overflow-hidden border border-border" style={{ height }}>
        <MapInner
          position={position}
          defaultCenter={defaultCenter}
          defaultZoom={defaultZoom}
          onLocationSelect={handleLocationSelect}
          mapRef={mapRef}
        />
      </div>

      {position && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4" />
          <span>
            Selected: {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </span>
        </div>
      )}
    </div>
  );
}
