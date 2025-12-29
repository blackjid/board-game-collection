"use client";

import { useState, useEffect, useCallback } from "react";
import { Save } from "lucide-react";

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

  const hasChanges = collectionNameInput !== (settings.collectionName || "");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">General</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configure your collection display settings
        </p>
      </div>

      {/* Collection Name Card */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg">Collection Name</CardTitle>
          <CardDescription>
            Override the default collection name displayed on the site. Leave empty to use the default (your BGG username).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
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
              disabled={saving || !hasChanges}
            >
              <Save className="size-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
          {settings.collectionName && (
            <p className="text-xs text-muted-foreground mt-3">
              Currently using: <span className="text-foreground">{settings.collectionName}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
