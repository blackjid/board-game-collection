"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Plus, User } from "lucide-react";

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

export interface Contributor {
  id: string;
  displayName: string;
}

interface ContributorSelectorProps {
  /** Selected contributor (null = "Me") */
  value: Contributor | null;
  /** Callback when contributor changes */
  onChange: (contributor: Contributor | null) => void;
  /** Additional class names */
  className?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

// ============================================================================
// Contributor Selector Component
// ============================================================================

export function ContributorSelector({
  value,
  onChange,
  className,
  disabled = false,
}: ContributorSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
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
      const response = await fetch(
        `/api/players?search=${encodeURIComponent(query)}`
      );
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

    if (searchValue.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        void searchPlayers(searchValue);
      }, 300);
    } else {
      setPlayers([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchValue]);

  // Reset search when popover closes
  useEffect(() => {
    if (!open) {
      setSearchValue("");
      setPlayers([]);
    }
  }, [open]);

  // Handle selecting "Me" (no contributor)
  const handleSelectMe = () => {
    onChange(null);
    setOpen(false);
  };

  // Handle selecting an existing player
  const handleSelectPlayer = (player: PlayerSearchResult) => {
    onChange({ id: player.id, displayName: player.displayName });
    setOpen(false);
  };

  // Handle creating a new player
  const handleCreateNew = async () => {
    if (!searchValue.trim()) return;

    try {
      const response = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: searchValue.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        onChange({
          id: data.player.id,
          displayName: data.player.displayName,
        });
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

  // Display text for the button
  const displayText = value ? value.displayName : "Me";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("justify-between font-normal", className)}
        >
          <span className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            {displayText}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search players..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {/* "Me" option - always visible */}
            <CommandGroup>
              <CommandItem onSelect={handleSelectMe}>
                <Check
                  className={cn(
                    "mr-2 size-4",
                    value === null ? "opacity-100" : "opacity-0"
                  )}
                />
                <User className="mr-2 size-4" />
                Me
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            {!loading && players.length === 0 && searchValue.trim() && (
              <CommandEmpty>No players found.</CommandEmpty>
            )}
            {!loading && players.length > 0 && (
              <CommandGroup heading="Players">
                {players.map((player) => (
                  <CommandItem
                    key={player.id}
                    value={player.id}
                    onSelect={() => handleSelectPlayer(player)}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        value?.id === player.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {formatPlayerDisplay(player)}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {searchValue.trim() && (
              <>
                {players.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Create New">
                  <CommandItem onSelect={handleCreateNew}>
                    <Plus className="mr-2 size-4" />
                    Create &quot;{searchValue}&quot;
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
