"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Dice6,
  MoreVertical,
  Eye,
  EyeOff,
  RefreshCw,
  ImageIcon,
  FolderPlus,
  Trash2,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import type { GameData } from "@/lib/games";

// Calculate rating color: red (4) -> yellow (6) -> green (8+)
function getRatingColor(rating: number): string {
  const clampedRating = Math.max(4, Math.min(8, rating));
  const normalized = (clampedRating - 4) / 4;

  let r, g, b;

  if (normalized < 0.5) {
    const t = normalized * 2;
    r = 220;
    g = Math.round(80 + t * 140);
    b = Math.round(60 - t * 20);
  } else {
    const t = (normalized - 0.5) * 2;
    r = Math.round(220 - t * 140);
    g = Math.round(180 + t * 20);
    b = Math.round(40 + t * 40);
  }

  return `rgb(${r}, ${g}, ${b})`;
}

export type SortField = "name" | "year" | "rating" | "players" | "playtime";
export type SortDirection = "asc" | "desc";

export interface GameTableProps {
  games: GameData[];
  isAdmin?: boolean;
  selectedIds?: Set<string>;
  onSelectGame?: (gameId: string) => void;
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSort?: (field: SortField) => void;
  onToggleVisibility?: (game: GameData) => void;
  onScrape?: (gameId: string) => void;
  onEditImages?: (game: GameData) => void;
  onAddToList?: (gameId: string) => void;
  onRemoveFromList?: (gameId: string) => void;
  scrapingIds?: Set<string>;
  queuedIds?: Set<string>;
  showRemoveFromList?: boolean;
  hasManualLists?: boolean;
}

function SortableHeader({
  label,
  field,
  currentField,
  direction,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  currentField?: SortField;
  direction?: SortDirection;
  onSort?: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentField === field;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-6 -ml-2 px-2 text-xs font-medium", className)}
      onClick={() => onSort?.(field)}
    >
      {label}
      {isActive ? (
        direction === "asc" ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <ArrowUpDown className="size-3 opacity-50" />
      )}
    </Button>
  );
}

export function GameTable({
  games,
  isAdmin = false,
  selectedIds = new Set(),
  onSelectGame,
  sortField,
  sortDirection,
  onSort,
  onToggleVisibility,
  onScrape,
  onEditImages,
  onAddToList,
  onRemoveFromList,
  scrapingIds = new Set(),
  queuedIds = new Set(),
  showRemoveFromList = false,
  hasManualLists = false,
}: GameTableProps) {
  // Render dropdown menu items
  const renderDropdownItems = (game: GameData) => {
    const isVisible = game.collections && game.collections.length > 0;
    const isScraping = scrapingIds.has(game.id);
    const isQueued = queuedIds.has(game.id);

    return (
      <>
        {onToggleVisibility && (
          <DropdownMenuItem onClick={() => onToggleVisibility(game)} className="gap-2">
            {isVisible ? (
              <>
                <EyeOff className="size-4" />
                Hide from Collection
              </>
            ) : (
              <>
                <Eye className="size-4" />
                Show in Collection
              </>
            )}
          </DropdownMenuItem>
        )}

        {onScrape && (
          <DropdownMenuItem
            onClick={() => onScrape(game.id)}
            disabled={isScraping || isQueued}
            className="gap-2"
          >
            <RefreshCw className={cn("size-4", isScraping && "animate-spin")} />
            {isScraping ? "Scraping..." : isQueued ? "Queued" : "Scrape Details"}
          </DropdownMenuItem>
        )}

        {onEditImages && (
          <DropdownMenuItem
            onClick={() => onEditImages(game)}
            disabled={!game.lastScraped}
            className="gap-2"
          >
            <ImageIcon className="size-4" />
            Edit Images
          </DropdownMenuItem>
        )}

        {hasManualLists && onAddToList && (
          <DropdownMenuItem onClick={() => onAddToList(game.id)} className="gap-2">
            <FolderPlus className="size-4" />
            Add to List
          </DropdownMenuItem>
        )}

        {showRemoveFromList && onRemoveFromList && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onRemoveFromList(game.id)}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" />
              Remove from List
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => window.open(`https://boardgamegeek.com/boardgame/${game.id}`, "_blank")}
          className="gap-2"
        >
          <ExternalLink className="size-4" />
          View on BGG
        </DropdownMenuItem>
      </>
    );
  };

  // Render context menu items
  const renderContextItems = (game: GameData) => {
    const isVisible = game.collections && game.collections.length > 0;
    const isScraping = scrapingIds.has(game.id);
    const isQueued = queuedIds.has(game.id);

    return (
      <>
        {onToggleVisibility && (
          <ContextMenuItem onClick={() => onToggleVisibility(game)} className="gap-2">
            {isVisible ? (
              <>
                <EyeOff className="size-4" />
                Hide from Collection
              </>
            ) : (
              <>
                <Eye className="size-4" />
                Show in Collection
              </>
            )}
          </ContextMenuItem>
        )}

        {onScrape && (
          <ContextMenuItem
            onClick={() => onScrape(game.id)}
            disabled={isScraping || isQueued}
            className="gap-2"
          >
            <RefreshCw className={cn("size-4", isScraping && "animate-spin")} />
            {isScraping ? "Scraping..." : isQueued ? "Queued" : "Scrape Details"}
          </ContextMenuItem>
        )}

        {onEditImages && (
          <ContextMenuItem
            onClick={() => onEditImages(game)}
            disabled={!game.lastScraped}
            className="gap-2"
          >
            <ImageIcon className="size-4" />
            Edit Images
          </ContextMenuItem>
        )}

        {hasManualLists && onAddToList && (
          <ContextMenuItem onClick={() => onAddToList(game.id)} className="gap-2">
            <FolderPlus className="size-4" />
            Add to List
          </ContextMenuItem>
        )}

        {showRemoveFromList && onRemoveFromList && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => onRemoveFromList(game.id)}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" />
              Remove from List
            </ContextMenuItem>
          </>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={() => window.open(`https://boardgamegeek.com/boardgame/${game.id}`, "_blank")}
          className="gap-2"
        >
          <ExternalLink className="size-4" />
          View on BGG
        </ContextMenuItem>
      </>
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent h-8">
          {isAdmin && onSelectGame && (
            <TableHead className="w-10 pl-4 pr-3"></TableHead>
          )}
          <TableHead className={cn("w-10", isAdmin ? "px-2" : "pl-4 pr-2")}></TableHead>
          <TableHead className="px-2">
            <SortableHeader
              label="Name"
              field="name"
              currentField={sortField}
              direction={sortDirection}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="w-16 px-2 hidden sm:table-cell">
            <SortableHeader
              label="Year"
              field="year"
              currentField={sortField}
              direction={sortDirection}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="w-14 px-2">
            <SortableHeader
              label="★"
              field="rating"
              currentField={sortField}
              direction={sortDirection}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="w-16 px-2 hidden md:table-cell">
            <SortableHeader
              label="Players"
              field="players"
              currentField={sortField}
              direction={sortDirection}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="w-16 px-2 hidden md:table-cell">
            <SortableHeader
              label="Time"
              field="playtime"
              currentField={sortField}
              direction={sortDirection}
              onSort={onSort}
            />
          </TableHead>
          {isAdmin && <TableHead className="w-16 px-2 hidden sm:table-cell">Status</TableHead>}
          {isAdmin && <TableHead className="w-8 px-1"></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {games.map((game) => {
          const imageUrl = game.selectedThumbnail || game.thumbnail || game.image || null;
          const isVisible = game.collections && game.collections.length > 0;
          const isSelected = selectedIds.has(game.id);
          const ratingColor = game.rating ? getRatingColor(game.rating) : undefined;

          const playerCount =
            game.minPlayers && game.maxPlayers
              ? game.minPlayers === game.maxPlayers
                ? `${game.minPlayers}`
                : `${game.minPlayers}-${game.maxPlayers}`
              : null;

          const playtime =
            game.minPlaytime && game.maxPlaytime
              ? game.minPlaytime === game.maxPlaytime
                ? `${game.minPlaytime}`
                : `${game.minPlaytime}-${game.maxPlaytime}`
              : null;

          const rowContent = (
            <TableRow
              key={game.id}
              data-state={isSelected ? "selected" : undefined}
              className={cn(
                "cursor-pointer h-10",
                isSelected && "bg-primary/5"
              )}
            >
              {isAdmin && onSelectGame && (
                <TableCell className="pl-4 pr-3 py-1" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelectGame(game.id)}
                    aria-label={`Select ${game.name}`}
                  />
                </TableCell>
              )}
              <TableCell className={cn("py-1", isAdmin ? "px-2" : "pl-4 pr-2")}>
                <div className="w-8 h-8 rounded overflow-hidden bg-muted relative flex-shrink-0">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt=""
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Dice6 className="size-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="px-2 py-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">
                    {game.name}
                  </span>
                  {game.isExpansion && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 flex-shrink-0">
                      Exp
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="px-2 py-1 text-xs text-muted-foreground hidden sm:table-cell">
                {game.yearPublished || "-"}
              </TableCell>
              <TableCell className="px-2 py-1">
                {game.rating ? (
                  <span
                    className="text-xs font-semibold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: ratingColor, color: "white" }}
                  >
                    {game.rating.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="px-2 py-1 text-xs text-muted-foreground hidden md:table-cell">
                {playerCount || "-"}
              </TableCell>
              <TableCell className="px-2 py-1 text-xs text-muted-foreground hidden md:table-cell">
                {playtime ? `${playtime}m` : "-"}
              </TableCell>
              {isAdmin && (
                <TableCell className="px-2 py-1 hidden sm:table-cell">
                  <span
                    className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded",
                      isVisible
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isVisible ? "Visible" : "Hidden"}
                  </span>
                </TableCell>
              )}
              {isAdmin && (
                <TableCell className="px-1 py-1" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="size-3.5" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {renderDropdownItems(game)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          );

          // Wrap with context menu for admin
          if (isAdmin) {
            return (
              <ContextMenu key={game.id}>
                <ContextMenuTrigger asChild>{rowContent}</ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  {renderContextItems(game)}
                </ContextMenuContent>
              </ContextMenu>
            );
          }

          // Wrap with link for non-admin
          return (
            <Link key={game.id} href={`/game/${game.id}`} className="contents">
              {rowContent}
            </Link>
          );
        })}
      </TableBody>
    </Table>
  );
}
