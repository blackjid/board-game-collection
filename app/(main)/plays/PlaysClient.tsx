"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Trophy,
  MapPin,
  Clock,
  MessageSquare,
  Pencil,
  Trash2,
  Users,
  Calendar,
  Plus,
  Dice6,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { EditPlayDialog } from "@/components/EditPlayDialog";
import { LogPlayDialog } from "@/components/LogPlayDialog";
import { GameSelectorDialog, type SelectedGame } from "@/components/GameSelectorDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { GamePlayData } from "@/types/play";

// ============================================================================
// Types
// ============================================================================

interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface GameOption {
  id: string;
  name: string;
  thumbnail: string | null;
}

interface PlaysClientProps {
  plays: GamePlayData[];
  games: GameOption[];
  currentUser: CurrentUser;
}

// ============================================================================
// Play Card Component
// ============================================================================

function PlayCard({
  play,
  currentUser,
  onEdit,
  onDelete,
}: {
  play: GamePlayData;
  currentUser: CurrentUser;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const canModify = currentUser.id === play.loggedById || currentUser.role === "admin";

  return (
    <div className="flex gap-4 p-4 rounded-lg border border-border bg-card hover:bg-card/80 transition-colors">
      {/* Game Thumbnail */}
      <Link href={`/game/${play.gameId}`} className="shrink-0">
        <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted">
          {play.game?.thumbnail ? (
            <Image
              src={play.game.thumbnail}
              alt={play.game?.name || "Game"}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Users className="size-6" />
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/game/${play.gameId}`}
              className="font-semibold text-foreground hover:text-primary transition-colors"
            >
              {play.game?.name || "Unknown Game"}
            </Link>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {format(new Date(play.playedAt), "MMM d, yyyy")}
              </span>
              {play.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {play.location}
                </span>
              )}
              {play.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {play.duration}m
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          {canModify && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="h-8 w-8 p-0"
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Players */}
        <div className="mt-2 flex flex-wrap gap-2">
          {play.players.map((player) => (
            <span
              key={player.id}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                player.isWinner
                  ? "bg-amber-600/20 text-amber-500"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {player.isWinner && <Trophy className="size-3" />}
              {player.name}
            </span>
          ))}
        </div>

        {/* Notes */}
        {play.notes && (
          <div className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
            <MessageSquare className="size-3.5 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{play.notes}</span>
          </div>
        )}

        {/* Logged by */}
        <div className="mt-2 text-xs text-muted-foreground/70">
          Logged by {play.loggedBy?.name || play.loggedBy?.email || "Unknown"}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Plays Client Component
// ============================================================================

export function PlaysClient({ plays: initialPlays, games, currentUser }: PlaysClientProps) {
  const router = useRouter();
  const [plays, setPlays] = useState(initialPlays);
  const [editingPlay, setEditingPlay] = useState<GamePlayData | null>(null);
  const [deletingPlay, setDeletingPlay] = useState<GamePlayData | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Game selector state
  const [showGameSelector, setShowGameSelector] = useState(false);
  const [selectedGame, setSelectedGame] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showLogPlayDialog, setShowLogPlayDialog] = useState(false);

  const handleGameSelect = (selectedGames: SelectedGame[]) => {
    if (selectedGames.length > 0) {
      const game = selectedGames[0];
      setSelectedGame({
        id: game.id,
        name: game.name,
      });
      setShowLogPlayDialog(true);
    }
  };

  const handlePlayLogged = () => {
    setSelectedGame(null);
    setShowLogPlayDialog(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deletingPlay) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/plays/${deletingPlay.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPlays(plays.filter((p) => p.id !== deletingPlay.id));
        setDeletingPlay(null);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete play");
      }
    } catch (error) {
      console.error("Failed to delete play:", error);
      alert("Failed to delete play");
    } finally {
      setDeleting(false);
    }
  };

  const handlePlayUpdated = () => {
    router.refresh();
  };

  // Header actions
  const headerActions = (
    <Button
      onClick={() => setShowGameSelector(true)}
      className="gap-2"
      size="sm"
    >
      <Plus className="size-4" />
      <span className="hidden sm:inline">Log Play</span>
    </Button>
  );

  return (
    <div className="flex-1 min-h-screen bg-background">
      <SiteHeader actions={headerActions} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Play History</h1>
          <p className="text-muted-foreground mt-1">
            All your logged game sessions
          </p>
        </div>

        {plays.length === 0 ? (
          <div className="text-center py-16">
            <Dice6 className="size-12 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No plays logged yet
            </h2>
            <p className="text-muted-foreground mb-6">
              Start tracking your game sessions by logging your first play!
            </p>
            <Button onClick={() => setShowGameSelector(true)}>
              <Plus className="size-4 mr-2" />
              Log Your First Play
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {plays.map((play) => (
              <PlayCard
                key={play.id}
                play={play}
                currentUser={currentUser}
                onEdit={() => setEditingPlay(play)}
                onDelete={() => setDeletingPlay(play)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Edit Play Dialog */}
      {editingPlay && (
        <EditPlayDialog
          open={!!editingPlay}
          onOpenChange={(open) => !open && setEditingPlay(null)}
          play={editingPlay}
          onPlayUpdated={handlePlayUpdated}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingPlay}
        onOpenChange={(open) => !open && setDeletingPlay(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Play?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this play log for{" "}
              <strong>{deletingPlay?.game?.name || "this game"}</strong>. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Game Selector Dialog */}
      <GameSelectorDialog
        open={showGameSelector}
        onOpenChange={setShowGameSelector}
        mode="single"
        title="Log a Play"
        description="Choose a game to log a play session"
        collectionGames={games}
        onSelect={handleGameSelect}
      />

      {/* Log Play Dialog */}
      {selectedGame && (
        <LogPlayDialog
          open={showLogPlayDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowLogPlayDialog(false);
              setSelectedGame(null);
            }
          }}
          gameId={selectedGame.id}
          gameName={selectedGame.name}
          onPlayLogged={handlePlayLogged}
        />
      )}
    </div>
  );
}
