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
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

export interface GameRowItemProps {
  game: GameData;
  isAdmin?: boolean;
  isSelected?: boolean;
  onSelect?: (gameId: string) => void;
  onToggleVisibility?: (game: GameData) => void;
  onScrape?: (gameId: string) => void;
  onEditImages?: (game: GameData) => void;
  onAddToList?: (gameId: string) => void;
  onRemoveFromList?: (gameId: string) => void;
  isScraping?: boolean;
  isInQueue?: boolean;
  isPending?: boolean;
  showRemoveFromList?: boolean;
  hasManualLists?: boolean;
}

export function GameRowItem({
  game,
  isAdmin = false,
  isSelected = false,
  onSelect,
  onToggleVisibility,
  onScrape,
  onEditImages,
  onAddToList,
  onRemoveFromList,
  isScraping = false,
  isInQueue = false,
  isPending = false,
  showRemoveFromList = false,
  hasManualLists = false,
}: GameRowItemProps) {
  const imageUrl = game.selectedThumbnail || game.thumbnail || game.image || null;
  const ratingColor = game.rating ? getRatingColor(game.rating) : undefined;

  // Check if game is visible (in a collection)
  const isVisible = game.collections && game.collections.length > 0;

  // Render dropdown menu items
  const renderDropdownItems = () => (
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
          disabled={isScraping || isInQueue}
          className="gap-2"
        >
          <RefreshCw className={cn("size-4", isScraping && "animate-spin")} />
          {isScraping ? "Scraping..." : isPending ? "Queued" : "Scrape Details"}
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

  // Render context menu items
  const renderContextItems = () => (
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
          disabled={isScraping || isInQueue}
          className="gap-2"
        >
          <RefreshCw className={cn("size-4", isScraping && "animate-spin")} />
          {isScraping ? "Scraping..." : isPending ? "Queued" : "Scrape Details"}
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

  const rowContent = (
    <div
      className={cn(
        "p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:bg-muted/50 transition-colors",
        isSelected && "bg-primary/5",
        !isAdmin && "cursor-pointer"
      )}
    >
      {/* Selection checkbox - admin only */}
      {isAdmin && onSelect && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(game.id)}
          aria-label={`Select ${game.name}`}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Thumbnail */}
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Dice6 className="size-6 text-muted-foreground" />
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
            <Badge variant="secondary" className="text-[10px] sm:text-xs bg-purple-600/20 text-purple-400 border-purple-500/30">
              Exp
            </Badge>
          )}
          {/* Warning for expansions without any base game in collection */}
          {game.isExpansion && game.expandsGames.length > 0 && !game.expandsGames.some(g => g.inCollection) && (
            <div 
              className="flex items-center gap-1 text-amber-500"
              title={`Works with: ${game.expandsGames.map(g => g.name).join(", ")}`}
            >
              <AlertTriangle className="size-3" />
              <span className="hidden sm:inline text-[10px]">Missing base</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
          {game.yearPublished && <span>{game.yearPublished}</span>}
          {game.lastScraped && (
            <span title="Scraped">
              <CheckCircle className="size-3 text-emerald-400" />
            </span>
          )}
          {game.rating && (
            <Badge
              className="text-white font-bold px-1.5 py-0 text-[10px] border-0"
              style={{ backgroundColor: ratingColor }}
            >
              ★ {game.rating.toFixed(1)}
            </Badge>
          )}
        </div>
      </div>

      {/* Status and actions */}
      <div className="flex items-center gap-2">
        {/* Status badge - admin only */}
        {isAdmin && (
          <>
            <Badge
              variant={isVisible ? "default" : "secondary"}
              className={cn(
                "text-xs hidden sm:flex",
                isVisible && "bg-primary/20 text-primary hover:bg-primary/30"
              )}
            >
              {isVisible ? "Visible" : "Hidden"}
            </Badge>

            {/* Mobile status dot */}
            <div
              className={cn(
                "size-2 rounded-full sm:hidden",
                isVisible ? "bg-primary" : "bg-muted-foreground"
              )}
              title={isVisible ? "Visible" : "Hidden"}
            />
          </>
        )}

        {/* Actions dropdown - admin only */}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {renderDropdownItems()}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );

  // Wrap with context menu for admin, link for non-admin
  if (isAdmin) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="cursor-default">{rowContent}</div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {renderContextItems()}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return (
    <Link href={`/game/${game.id}`} className="block">
      {rowContent}
    </Link>
  );
}
