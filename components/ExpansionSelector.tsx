"use client";

import { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { Check, ChevronDown, Package, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ============================================================================
// Types
// ============================================================================

export interface ExpansionOption {
  id: string;
  name: string;
  thumbnail: string | null;
}

interface ExpansionSelectorProps {
  availableExpansions: ExpansionOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

// ============================================================================
// ExpansionSelector Component
// ============================================================================

export function ExpansionSelector({
  availableExpansions,
  selectedIds,
  onChange,
  label = "Expansions Used",
  collapsible = true,
  defaultOpen = false,
}: ExpansionSelectorProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || selectedIds.length > 0);
  const [filter, setFilter] = useState("");

  // Filter expansions by search
  const filteredExpansions = useMemo(() => {
    if (!filter.trim()) return availableExpansions;
    const query = filter.toLowerCase();
    return availableExpansions.filter((exp) =>
      exp.name.toLowerCase().includes(query)
    );
  }, [availableExpansions, filter]);

  // Toggle expansion selection
  const toggleExpansion = useCallback(
    (expansionId: string) => {
      if (selectedIds.includes(expansionId)) {
        onChange(selectedIds.filter((id) => id !== expansionId));
      } else {
        onChange([...selectedIds, expansionId]);
      }
    },
    [selectedIds, onChange]
  );

  // Select/deselect all visible
  const toggleAll = useCallback(() => {
    const filteredIds = filteredExpansions.map((e) => e.id);
    const allSelected = filteredIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      // Deselect all filtered
      onChange(selectedIds.filter((id) => !filteredIds.includes(id)));
    } else {
      // Select all filtered
      const newIds = new Set([...selectedIds, ...filteredIds]);
      onChange(Array.from(newIds));
    }
  }, [filteredExpansions, selectedIds, onChange]);

  // Check if all filtered are selected
  const allFilteredSelected =
    filteredExpansions.length > 0 &&
    filteredExpansions.every((e) => selectedIds.includes(e.id));

  // No expansions available
  if (availableExpansions.length === 0) {
    return null;
  }

  const content = (
    <div className="space-y-3">
      {/* Search and select all */}
      {availableExpansions.length > 3 && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Filter expansions..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleAll}
            className="shrink-0 text-xs"
          >
            {allFilteredSelected ? "Deselect all" : "Select all"}
          </Button>
        </div>
      )}

      {/* Expansion list */}
      <div className="grid gap-2 max-h-48 overflow-y-auto">
        {filteredExpansions.map((expansion) => {
          const isSelected = selectedIds.includes(expansion.id);

          return (
            <label
              key={expansion.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-transparent bg-muted/30 hover:bg-muted/50"
              )}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleExpansion(expansion.id)}
              />

              {/* Thumbnail */}
              <div className="relative w-8 h-8 rounded overflow-hidden bg-muted shrink-0">
                {expansion.thumbnail ? (
                  <Image
                    src={expansion.thumbnail}
                    alt=""
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="size-4 text-muted-foreground" />
                  </div>
                )}
              </div>

              <span className="text-sm font-medium truncate flex-1">
                {expansion.name}
              </span>

              {isSelected && (
                <Check className="size-4 text-primary shrink-0" />
              )}
            </label>
          );
        })}

        {filteredExpansions.length === 0 && filter.trim() && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No expansions match &quot;{filter}&quot;
          </div>
        )}
      </div>

      {/* Summary */}
      {selectedIds.length > 0 && (
        <div className="text-xs text-muted-foreground pt-1 border-t">
          {selectedIds.length} expansion{selectedIds.length !== 1 ? "s" : ""}{" "}
          selected
        </div>
      )}
    </div>
  );

  // Non-collapsible version
  if (!collapsible) {
    return (
      <div className="space-y-2">
        <Label className="text-base">{label}</Label>
        {content}
      </div>
    );
  }

  // Collapsible version
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-between px-0 hover:bg-transparent"
        >
          <span className="flex items-center gap-2">
            <Package className="size-4 text-muted-foreground" />
            <span className="font-medium">{label}</span>
            {selectedIds.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {selectedIds.length}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">{content}</CollapsibleContent>
    </Collapsible>
  );
}
