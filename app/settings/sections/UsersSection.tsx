"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Edit, UserPlus, ChevronDown, MoreVertical, Shield, User } from "lucide-react";

import { useSettings } from "../layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { useRowSelection } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

export function UsersSection() {
  const { currentUser } = useSettings();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [userFormData, setUserFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "user",
  });
  const [savingUser, setSavingUser] = useState(false);
  const [userError, setUserError] = useState("");

  // Row selection for bulk actions
  const selectableUsers = users.filter((u) => u.id !== currentUser?.id);
  const {
    selectedCount,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    allSelected,
    someSelected,
    selectedItems,
  } = useRowSelection({
    items: selectableUsers,
    getItemId: (user) => user.id,
  });

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenUserModal = (user?: UserData) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({
        email: user.email,
        password: "",
        name: user.name || "",
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setUserFormData({ email: "", password: "", name: "", role: "user" });
    }
    setUserError("");
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    setSavingUser(true);
    setUserError("");

    try {
      if (editingUser) {
        const response = await fetch(`/api/auth/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: userFormData.name || null,
            role: userFormData.role,
            ...(userFormData.password && { password: userFormData.password }),
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          setUserError(data.error || "Failed to update user");
          return;
        }
      } else {
        if (!userFormData.email || !userFormData.password) {
          setUserError("Email and password are required");
          return;
        }

        const response = await fetch("/api/auth/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userFormData.email,
            password: userFormData.password,
            name: userFormData.name || null,
            role: userFormData.role,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          setUserError(data.error || "Failed to create user");
          return;
        }
      }

      await fetchUsers();
      setShowUserModal(false);
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    const response = await fetch(`/api/auth/users/${userId}`, { method: "DELETE" });
    if (response.ok) {
      await fetchUsers();
    } else {
      const data = await response.json();
      alert(data.error || "Failed to delete user");
    }
  };

  const handleSetRole = async (userId: string, role: string) => {
    await fetch(`/api/auth/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    await fetchUsers();
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedCount} user(s)?`)) return;

    await Promise.all(
      selectedItems.map((user) =>
        fetch(`/api/auth/users/${user.id}`, { method: "DELETE" })
      )
    );
    clearSelection();
    await fetchUsers();
  };

  const handleBulkRoleChange = async (role: string) => {
    await Promise.all(
      selectedItems.map((user) =>
        fetch(`/api/auth/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        })
      )
    );
    clearSelection();
    await fetchUsers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Users</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage who can access the settings
          </p>
        </div>
        <Button onClick={() => handleOpenUserModal()}>
          <UserPlus className="size-4" />
          Add User
        </Button>
      </div>

      <Card className="gap-0">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg">{users.length} Users</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {/* Select All Header with Bulk Actions */}
          {selectableUsers.length > 0 && (
            <div className={cn(
              "px-3 sm:px-4 h-12 border-b border-border flex items-center gap-3 sm:gap-4",
              selectedCount > 0 ? "bg-primary/10" : "bg-muted/30"
            )}>
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all"
                {...(someSelected ? { "data-state": "indeterminate" } : {})}
              />
              <span className="text-xs text-muted-foreground flex-1">
                {selectedCount > 0
                  ? `${selectedCount} user${selectedCount !== 1 ? "s" : ""} selected`
                  : allSelected ? "Deselect all" : "Select all (except yourself)"}
              </span>
              {selectedCount > 0 && (
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Actions
                        <ChevronDown className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleBulkRoleChange("admin")}>
                        <Shield className="size-4" />
                        Make Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkRoleChange("user")}>
                        <User className="size-4" />
                        Make User
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={handleBulkDelete}
                      >
                        <Trash2 className="size-4" />
                        Delete Selected
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="divide-y divide-border">
            {users.map((user) => {
              const isCurrentUser = currentUser?.id === user.id;

              // Actions component for both context menu and dropdown
              const UserActions = ({ asContext = false }: { asContext?: boolean }) => {
                const MenuItem = asContext ? ContextMenuItem : DropdownMenuItem;
                const MenuSeparator = asContext ? ContextMenuSeparator : DropdownMenuSeparator;

                return (
                  <>
                    <MenuItem onClick={() => handleOpenUserModal(user)}>
                      <Edit className="size-4" />
                      Edit
                    </MenuItem>
                    {!isCurrentUser && (
                      <>
                        <MenuSeparator />
                        <MenuItem onClick={() => handleSetRole(user.id, user.role === "admin" ? "user" : "admin")}>
                          {user.role === "admin" ? (
                            <>
                              <User className="size-4" />
                              Make User
                            </>
                          ) : (
                            <>
                              <Shield className="size-4" />
                              Make Admin
                            </>
                          )}
                        </MenuItem>
                        <MenuSeparator />
                        <MenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </MenuItem>
                      </>
                    )}
                  </>
                );
              };

              return (
                <ContextMenu key={user.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      className={cn(
                        "p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:bg-muted/50 transition-colors cursor-default",
                        !isCurrentUser && isSelected(user.id) && "bg-primary/5"
                      )}
                    >
                      {/* Checkbox - only for non-current users */}
                      {!isCurrentUser ? (
                        <Checkbox
                          checked={isSelected(user.id)}
                          onCheckedChange={() => toggleItem(user.id)}
                          aria-label={`Select ${user.name || user.email}`}
                        />
                      ) : (
                        <div className="size-4" />
                      )}

                      <Avatar className="size-10 bg-secondary flex-shrink-0">
                        <AvatarFallback className="bg-secondary text-secondary-foreground font-bold">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground truncate text-sm sm:text-base">
                            {user.name || user.email}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="truncate">{user.email}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline capitalize">{user.role}</span>
                        </div>
                      </div>

                      {/* Role Badge */}
                      <Badge
                        variant={user.role === "admin" ? "default" : "secondary"}
                        className={cn(
                          "text-xs hidden sm:flex",
                          user.role === "admin" && "bg-primary/20 text-primary hover:bg-primary/30"
                        )}
                      >
                        {user.role === "admin" ? "Admin" : "User"}
                      </Badge>

                      {/* Status dot for mobile */}
                      <div
                        className={cn(
                          "size-2 rounded-full sm:hidden flex-shrink-0",
                          user.role === "admin" ? "bg-primary" : "bg-muted-foreground"
                        )}
                        title={user.role}
                      />

                      {/* Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                            <MoreVertical className="size-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <UserActions />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <UserActions asContext />
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
            {users.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No users found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : "Create User"}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? "Update user information" : "Add a new user to the system"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                type="text"
                value={userFormData.name}
                onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {editingUser ? "New Password (leave blank to keep current)" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={userFormData.role}
                onValueChange={(value) => setUserFormData({ ...userFormData, role: value })}
                disabled={editingUser?.id === currentUser?.id}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {editingUser?.id === currentUser?.id && (
                <p className="text-xs text-muted-foreground">You cannot change your own role</p>
              )}
            </div>

            {userError && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                {userError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUserModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser} disabled={savingUser}>
              {savingUser ? "Saving..." : editingUser ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
