"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Users, User, Clock, Gamepad2, RefreshCw, CheckCircle, XCircle, PlayCircle, AlertTriangle } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SessionData {
  id: string;
  code: string;
  type: "solo" | "collaborative";
  hostName: string;
  status: "active" | "completed" | "cancelled";
  createdAt: string;
  completedAt: string | null;
  winnerGameId: string | null;  // The picked game's ID
  winnerGame: {                 // The picked game details
    id: string;
    name: string;
    image: string | null;
  } | null;
  playerCount: number;
  gameCount: number;
  voteCount: number;
}

interface PaginationData {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export function SessionsSection() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("limit", "50");

      const response = await fetch(`/api/pick/sessions/admin?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
        setPagination(data.pagination);
        setSelectedIds(new Set());
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sessions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sessions.map((s) => s.id)));
    }
  };

  const handleDeleteClick = () => {
    if (selectedIds.size === 0) return;
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch("/api/pick/sessions/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIds: Array.from(selectedIds) }),
      });

      if (response.ok) {
        await fetchSessions();
      }
    } catch (error) {
      console.error("Failed to delete sessions:", error);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-emerald-600">
            <CheckCircle className="size-3 mr-1" />
            Completed
          </Badge>
        );
      case "active":
        return (
          <Badge variant="default" className="bg-blue-600">
            <PlayCircle className="size-3 mr-1" />
            Active
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="secondary">
            <XCircle className="size-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    if (type === "solo") {
      return (
        <Badge variant="outline" className="text-amber-500 border-amber-500/50">
          <User className="size-3 mr-1" />
          Solo
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-blue-500 border-blue-500/50">
        <Users className="size-3 mr-1" />
        Collaborative
      </Badge>
    );
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Pick Sessions</h2>
        <p className="text-muted-foreground text-sm mt-1">
          View and manage game picking sessions
        </p>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="solo">Solo</SelectItem>
                  <SelectItem value="collaborative">Collaborative</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" onClick={fetchSessions} disabled={loading}>
                <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                onClick={handleDeleteClick}
                disabled={deleting}
                className="gap-2"
              >
                <Trash2 className="size-4" />
                Delete {selectedIds.size} Selected
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Gamepad2 className="size-12 mx-auto mb-4 opacity-50" />
              <p>No sessions found</p>
              <p className="text-sm mt-1">Sessions will appear here after users pick games</p>
            </div>
          ) : (
            <>
              {/* Select all row */}
              <div className="flex items-center gap-3 py-3 px-2 border-b border-border">
                <Checkbox
                  checked={selectedIds.size === sessions.length && sessions.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} selected`
                    : "Select all"}
                </span>
              </div>

              {/* Session rows */}
              <div className="divide-y divide-border">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`flex items-start gap-3 py-4 px-2 hover:bg-muted/50 transition-colors ${
                      selectedIds.has(session.id) ? "bg-muted/30" : ""
                    }`}
                  >
                    <Checkbox
                      checked={selectedIds.has(session.id)}
                      onCheckedChange={() => toggleSelect(session.id)}
                      className="mt-1"
                    />

                    {/* Session content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-3">
                        {/* Thumbnail */}
                        {session.winnerGame?.image ? (
                          <div className="size-12 sm:size-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <Image
                              src={session.winnerGame.image}
                              alt={session.winnerGame.name}
                              width={48}
                              height={48}
                              className="size-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="size-12 sm:size-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Gamepad2 className="size-5 text-muted-foreground" />
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {session.winnerGame?.name || (
                              session.status === "active"
                                ? "In progress..."
                                : "No game picked"
                            )}
                          </div>

                          {/* Metadata row */}
                          <div className="text-sm text-muted-foreground mt-0.5">
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                              {session.code}
                            </span>
                            <span className="ml-2">{session.hostName}</span>
                            <span className="hidden sm:inline ml-3">
                              <Users className="size-3 inline mr-1" />
                              {session.playerCount}
                            </span>
                            <span className="hidden sm:inline ml-3">
                              <Gamepad2 className="size-3 inline mr-1" />
                              {session.gameCount} games
                            </span>
                          </div>

                          {/* Badges + Date - desktop: inline, mobile: stacked */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {getTypeBadge(session.type)}
                            {getStatusBadge(session.status)}

                            {/* Mobile: extra info */}
                            <span className="sm:hidden text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="size-3" />
                              {session.playerCount}
                            </span>
                            <span className="sm:hidden text-xs text-muted-foreground flex items-center gap-1">
                              <Gamepad2 className="size-3" />
                              {session.gameCount}
                            </span>

                            {/* Date - always visible */}
                            <span className="text-xs text-muted-foreground flex items-center gap-1 sm:ml-auto">
                              <Clock className="size-3" />
                              <span className="sm:hidden">
                                {new Date(session.createdAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              <span className="hidden sm:inline">
                                {formatDate(session.createdAt)}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination info */}
              {pagination && (
                <div className="pt-4 text-sm text-muted-foreground text-center">
                  Showing {sessions.length} of {pagination.total} sessions
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats Card */}
      {pagination && pagination.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Session Statistics</CardTitle>
            <CardDescription>Overview of all pick sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{pagination.total}</div>
                <div className="text-sm text-muted-foreground">Total Sessions</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-amber-500">
                  {sessions.filter((s) => s.type === "solo").length}
                </div>
                <div className="text-sm text-muted-foreground">Solo</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-500">
                  {sessions.filter((s) => s.type === "collaborative").length}
                </div>
                <div className="text-sm text-muted-foreground">Collaborative</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-500">
                  {sessions.filter((s) => s.status === "completed").length}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Delete Sessions
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{selectedIds.size}</span>{" "}
              session{selectedIds.size !== 1 ? "s" : ""}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
