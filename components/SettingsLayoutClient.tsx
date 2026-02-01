"use client";

import { Suspense } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SettingsSidebar } from "@/components/SettingsSidebar";

interface SettingsLayoutClientProps {
  children: React.ReactNode;
}

export function SettingsLayoutClient({
  children,
}: SettingsLayoutClientProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <Suspense fallback={null}>
        <SettingsSidebar />
      </Suspense>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
