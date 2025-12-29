"use client";

import { useState, useEffect, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">General Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configure your collection display settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collection Name</CardTitle>
          <CardDescription>
            Override the default collection name displayed on the site. Leave empty to use the default (your BGG username).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
            <div className="flex-1 space-y-2">
              <Label htmlFor="collection-name" className="sr-only">
                Collection Name
              </Label>
              <Input
                id="collection-name"
                type="text"
                value={collectionNameInput}
                onChange={(e) => setCollectionNameInput(e.target.value)}
                placeholder="My Board Game Collection"
              />
            </div>
            <Button
              onClick={saveSettings}
              disabled={saving || collectionNameInput === (settings.collectionName || "")}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Version info */}
      <Separator />
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <p className="text-muted-foreground text-xs">
          Version: <span className="font-mono text-foreground/70">{appVersion}</span>
        </p>
        {formattedCommitSha && (
          <p className="text-muted-foreground text-xs">
            Commit: <span className="font-mono text-foreground/70">{formattedCommitSha}</span>
          </p>
        )}
      </div>
    </div>
  );
}
