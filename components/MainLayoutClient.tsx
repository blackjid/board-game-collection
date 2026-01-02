"use client";

import { Suspense } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar, type CurrentUser } from "@/components/AppSidebar";
import type { CollectionSummary } from "@/lib/games";

interface MainLayoutClientProps {
  collections: CollectionSummary[];
  allGamesCount: number;
  user: CurrentUser | null;
  children: React.ReactNode;
}

export function MainLayoutClient({
  collections,
  allGamesCount,
  user,
  children,
}: MainLayoutClientProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <Suspense fallback={null}>
        <AppSidebar
          collections={collections}
          allGamesCount={allGamesCount}
          user={user}
        />
      </Suspense>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
