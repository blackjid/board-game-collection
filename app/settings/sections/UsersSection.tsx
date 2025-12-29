"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Edit, UserPlus, ChevronDown } from "lucide-react";

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
} from "@/components/ui/dropdown-menu";
import { useRowSelection } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

export function UsersSection() {
  const { currentUser } = useSettings();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
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

  const handleOpenUserModal = (user?: User) => {
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

      <Card>
        {/* Bulk Actions Bar */}
        {selectedCount > 0 && (
          <div className="px-6 py-3 bg-primary/10 border-b border-border flex items-center justify-between gap-3">
            <span className="text-sm text-foreground">
              {selectedCount} user{selectedCount !== 1 ? "s" : ""} selected
            </span>
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
                    Set as Admin
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkRoleChange("user")}>
                    Set as User
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
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
          </div>
        )}

        <CardContent className="p-0">
          {/* Select All Header - Only show if there are selectable users */}
          {selectableUsers.length > 0 && (
            <div className="px-4 py-2 border-b border-border flex items-center gap-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all"
                {...(someSelected ? { "data-state": "indeterminate" } : {})}
              />
              <span className="text-xs text-muted-foreground">
                {allSelected ? "Deselect all" : "Select all (except yourself)"}
              </span>
            </div>
          )}

          <div className="divide-y divide-border">
            {users.map((user) => {
              const isCurrentUser = currentUser?.id === user.id;
              return (
                <div
                  key={user.id}
                  className={cn(
                    "p-4 sm:p-5 flex items-center gap-3",
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
                    <div className="size-4" /> // Spacer for alignment
                  )}

                  <Avatar className="size-10 bg-secondary">
                    <AvatarFallback className="bg-secondary text-secondary-foreground font-bold">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground truncate text-sm sm:text-base">
                        {user.name || user.email}
                      </span>
                      <Badge
                        variant={user.role === "admin" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {user.role}
                      </Badge>
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {user.email}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenUserModal(user)}
                    >
                      <Edit className="size-4" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    {!isCurrentUser && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    )}
                  </div>
                </div>
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
