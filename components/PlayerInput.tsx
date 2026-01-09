"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

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
  onChange: (name: string, playerId?: string | null) => void;
  placeholder?: string;
  className?: string;
}

// ============================================================================
// Player Input Component
// ============================================================================

export function PlayerInput({
  value,
  playerId,
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
    onChange(player.displayName, player.id);
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
        onChange(data.player.displayName, data.player.id);
        setOpen(false);
      }
    } catch (error) {
      console.error("Failed to create player:", error);
    }
  };

  // Format player display name with details
  const formatPlayerDisplay = (player: PlayerSearchResult) => {
    if (player.firstName || player.lastName) {
      return `${player.displayName} (${[player.firstName, player.lastName].filter(Boolean).join(" ")})`;
    }
    return player.displayName;
  };

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
          <span className={cn(!value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search players..."
            value={value}
            onValueChange={(newValue) => onChange(newValue, null)}
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
                <CommandGroup>
                  <CommandItem onSelect={handleCreateNew}>
                    <Plus className="mr-2 size-4" />
                    Create &quot;{value}&quot; as new player
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
