"use client"

import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface MultiSelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  maxDisplayedItems?: number
  disabled?: boolean
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  searchPlaceholder = "Search...",
  emptyMessage = "No items found.",
  className,
  maxDisplayedItems = 3,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    onChange(newSelected)
  }

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter((item) => item !== value))
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  const selectedOptions = options.filter((option) =>
    selected.includes(option.value)
  )

  const displayedItems = selectedOptions.slice(0, maxDisplayedItems)
  const remainingCount = selectedOptions.length - maxDisplayedItems

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "min-h-9 h-auto w-full justify-between px-3 py-2",
            selected.length > 0 && "h-auto",
            className
          )}
        >
          <div className="flex flex-wrap gap-1.5 flex-1">
            {selected.length === 0 ? (
              <span className="text-muted-foreground font-normal">
                {placeholder}
              </span>
            ) : (
              <>
                {displayedItems.map((option) => (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    className="rounded-sm px-1.5 py-0 text-xs font-normal"
                  >
                    {option.label}
                    <button
                      type="button"
                      className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleRemove(option.value, e)}
                    >
                      <XIcon className="size-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </Badge>
                ))}
                {remainingCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1.5 py-0 text-xs font-normal"
                  >
                    +{remainingCount} more
                  </Badge>
                )}
              </>
            )}
          </div>
          <div className="flex shrink-0 gap-1 ml-2">
            {selected.length > 0 && (
              <div
                role="button"
                tabIndex={0}
                className="rounded-sm opacity-50 hover:opacity-100"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleClear(e as unknown as React.MouseEvent)
                  }
                }}
              >
                <XIcon className="size-4" />
              </div>
            )}
            <ChevronsUpDownIcon className="size-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <div
                      className={cn(
                        "mr-2 flex size-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <CheckIcon className="size-3" />
                    </div>
                    <span>{option.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Simpler checkbox-based row selection for tables/lists
interface UseRowSelectionOptions<T> {
  items: T[]
  getItemId: (item: T) => string
}

export function useRowSelection<T>({ items, getItemId }: UseRowSelectionOptions<T>) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  const toggleItem = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleAll = React.useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === items.length) {
        return new Set()
      }
      return new Set(items.map(getItemId))
    })
  }, [items, getItemId])

  const clearSelection = React.useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isSelected = React.useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  )

  const selectedItems = React.useMemo(
    () => items.filter((item) => selectedIds.has(getItemId(item))),
    [items, selectedIds, getItemId]
  )

  const allSelected = items.length > 0 && selectedIds.size === items.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length

  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.size,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    allSelected,
    someSelected,
  }
}
