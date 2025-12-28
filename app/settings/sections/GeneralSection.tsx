"use client";

import { useState, useEffect, useCallback } from "react";

interface Settings {
  collectionName: string | null;
}

export function GeneralSection() {
  const [settings, setSettings] = useState<Settings>({ collectionName: null });
  const [collectionNameInput, setCollectionNameInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();
      setSettings(data);
      setCollectionNameInput(data.collectionName || "");
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionName: collectionNameInput || null }),
      });
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  // Get version and commit SHA from environment variables (baked in at build time)
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
  const commitSha = process.env.NEXT_PUBLIC_APP_COMMIT_SHA || "";

  // Format commit SHA: truncate to 7 characters if present
  const formattedCommitSha = commitSha.length >= 7 ? commitSha.substring(0, 7) : commitSha;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-stone-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white">General Settings</h2>
        <p className="text-stone-400 text-sm mt-1">
          Configure your collection display settings
        </p>
      </div>

      <div className="bg-stone-900 rounded-xl p-4 sm:p-6">
        <div className="max-w-xl">
          <label className="block text-sm font-medium text-stone-300 mb-2">
            Collection Name
          </label>
          <p className="text-stone-500 text-xs mb-3">
            Override the default collection name displayed on the site. Leave empty to use the default (your BGG username).
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={collectionNameInput}
              onChange={(e) => setCollectionNameInput(e.target.value)}
              placeholder="My Board Game Collection"
              className="flex-1 px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
            />
            <button
              onClick={saveSettings}
              disabled={saving || collectionNameInput === (settings.collectionName || "")}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Version info */}
      <div className="border-t border-stone-800 pt-4 flex flex-wrap gap-x-4 gap-y-1">
        <p className="text-stone-500 text-xs">
          Version: <span className="font-mono text-stone-400">{appVersion}</span>
        </p>
        {formattedCommitSha && (
          <p className="text-stone-500 text-xs">
            Commit: <span className="font-mono text-stone-400">{formattedCommitSha}</span>
          </p>
        )}
      </div>
    </div>
  );
}
