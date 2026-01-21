"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Plus, UserX } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { PlayerSearchResult } from "@/types/player";

// ============================================================================
// Types
// ============================================================================

interface PlayerInputProps {
  value: string;
  playerId?: string | null;
  isGuest?: boolean;
  onChange: (name: string, playerId?: string | null, isGuest?: boolean) => void;
  placeholder?: string;
  className?: string;
}

// ============================================================================
// Player Input Component
// ============================================================================

export function PlayerInput({
  value,
  playerId,
  isGuest = false,
  onChange,
  placeholder = "Player name",
  className,
}: PlayerInputProps) {
  const [open, setOpen] = useState(false);
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Search for players
  const searchPlayers = async (query: string) => {
    if (!query.trim()) {
      setPlayers([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/players?search=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players || []);
      }
    } catch (error) {
      console.error("Failed to search players:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        void searchPlayers(value);
      }, 300);
    } else {
      setPlayers([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [value]);

  // Handle selecting an existing player
  const handleSelectPlayer = (player: PlayerSearchResult) => {
    onChange(player.displayName, player.id, false);
    setOpen(false);
  };

  // Handle creating a new player
  const handleCreateNew = async () => {
    if (!value.trim()) return;

    try {
      const response = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: value.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        onChange(data.player.displayName, data.player.id, false);
        setOpen(false);
      }
    } catch (error) {
      console.error("Failed to create player:", error);
    }
  };

  // Handle adding as guest (no player entity)
  const handleAddAsGuest = () => {
    if (!value.trim()) return;
    onChange(value.trim(), null, true);
    setOpen(false);
  };

  // Format player display name with details
  const formatPlayerDisplay = (player: PlayerSearchResult) => {
    if (player.firstName || player.lastName) {
      return `${player.displayName} (${[player.firstName, player.lastName].filter(Boolean).join(" ")})`;
    }
    return player.displayName;
  };

  // Get display label based on player type
  const getTypeLabel = () => {
    if (playerId) return null; // Linked to existing player - no label needed
    if (isGuest) return "Guest";
    return null;
  };

  const typeLabel = getTypeLabel();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between font-normal",
            open && "ring-0 focus-visible:ring-0",
            className
          )}
        >
          <span className={cn("flex items-center gap-2", !value && "text-muted-foreground")}>
            {value || placeholder}
            {typeLabel && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {typeLabel}
              </span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search players..."
            value={value}
            onValueChange={(newValue) => onChange(newValue, null, false)}
          />
          <CommandList>
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            {!loading && players.length === 0 && value.trim() && (
              <CommandEmpty>No players found.</CommandEmpty>
            )}
            {!loading && players.length > 0 && (
              <CommandGroup heading="Existing Players">
                {players.map((player) => (
                  <CommandItem
                    key={player.id}
                    value={player.id}
                    onSelect={() => handleSelectPlayer(player)}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        playerId === player.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {formatPlayerDisplay(player)}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {value.trim() && (
              <>
                {players.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Add Player">
                  <CommandItem onSelect={handleCreateNew}>
                    <Plus className="mr-2 size-4" />
                    Create &quot;{value}&quot; as tracked player
                  </CommandItem>
                  <CommandItem onSelect={handleAddAsGuest}>
                    <UserX className="mr-2 size-4" />
                    Add &quot;{value}&quot; as guest
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
