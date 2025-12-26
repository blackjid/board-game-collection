"use client";

import { useState, useEffect, useCallback } from "react";
import { useSettings } from "../layout";

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-stone-500">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Users</h2>
          <p className="text-stone-400 text-sm mt-1">
            Manage who can access the settings
          </p>
        </div>
        <button
          onClick={() => handleOpenUserModal()}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors text-sm"
        >
          Add User
        </button>
      </div>

      <div className="bg-stone-900 rounded-xl overflow-hidden">
        <div className="divide-y divide-stone-800">
          {users.map((user) => (
            <div key={user.id} className="p-4 sm:p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-stone-700 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white truncate text-sm sm:text-base">
                      {user.name || user.email}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        user.role === "admin"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-stone-700 text-stone-400"
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5 truncate">
                    {user.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleOpenUserModal(user)}
                  className="px-3 py-1.5 text-sm text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors"
                >
                  Edit
                </button>
                {currentUser?.id !== user.id && (
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="p-8 text-center text-stone-500 text-sm">
              No users found.
            </div>
          )}
        </div>
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 rounded-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-stone-700">
              <h2 className="text-xl font-bold text-white">
                {editingUser ? "Edit User" : "Create User"}
              </h2>
              <p className="text-stone-400 text-sm mt-1">
                {editingUser ? "Update user information" : "Add a new user to the system"}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="user@example.com"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1.5">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1.5">
                  {editingUser ? "New Password (leave blank to keep current)" : "Password"}
                </label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1.5">
                  Role
                </label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                  disabled={editingUser?.id === currentUser?.id}
                  className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                {editingUser?.id === currentUser?.id && (
                  <p className="text-xs text-stone-500 mt-1">You cannot change your own role</p>
                )}
              </div>

              {userError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {userError}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-stone-700 flex justify-end gap-3">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 text-stone-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                disabled={savingUser}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {savingUser ? "Saving..." : editingUser ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
