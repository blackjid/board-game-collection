"use client";

import { Info, Package, GitCommit, Github, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AboutSection() {
  // Get version and commit SHA from environment variables (baked in at build time)
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
  const commitSha = process.env.NEXT_PUBLIC_APP_COMMIT_SHA || "";

  // Format commit SHA: truncate to 7 characters if present
  const formattedCommitSha = commitSha.length >= 7 ? commitSha.substring(0, 7) : commitSha;

  // Repository URL - can be configured via environment variable
  const repoUrl = process.env.NEXT_PUBLIC_REPO_URL || "https://github.com/blackjid/board-game-collection";

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">About</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Application information and version details
        </p>
      </div>

      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-muted-foreground" />
            <CardTitle className="text-lg">Version Info</CardTitle>
          </div>
          <CardDescription>
            Current application version and build information
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Version */}
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Package className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">Version</span>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                {appVersion}
              </Badge>
            </div>

            {/* Commit */}
            {formattedCommitSha && (
              <div className="bg-muted/40 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <GitCommit className="size-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground text-xs">Commit</span>
                </div>
                <a
                  href={`${repoUrl}/commit/${commitSha}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 group"
                >
                  <Badge variant="outline" className="font-mono text-xs group-hover:bg-muted transition-colors">
                    {formattedCommitSha}
                  </Badge>
                  <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
            )}

            {/* Repository */}
            <div className="bg-muted/40 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Github className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">Repository</span>
              </div>
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 group"
              >
                <Badge variant="outline" className="font-mono text-xs group-hover:bg-muted transition-colors">
                  GitHub
                </Badge>
                <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
