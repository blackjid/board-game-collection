"use client";

import { useState, useEffect, useCallback, createContext, useContext, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Settings, RefreshCw, Users, Gamepad2, Info, UsersRound, MapPin } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { GeneralSection } from "./sections/GeneralSection";
import { CollectionSection } from "./sections/CollectionSection";
import { SessionsSection } from "./sections/SessionsSection";
import { UsersSection } from "./sections/UsersSection";
import { PlayersSection } from "./sections/PlayersSection";
import { LocationsSection } from "./sections/LocationsSection";
import { AboutSection } from "./sections/AboutSection";

// ============================================================================
// Types and Context
// ============================================================================

interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface SettingsContextType {
  currentUser: CurrentUser | null;
  refreshData: () => void;
}

export const SettingsContext = createContext<SettingsContextType>({
  currentUser: null,
  refreshData: () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

// ============================================================================
// Section Configuration
// ============================================================================

const SECTIONS = [
  { id: "general", label: "General", Icon: Settings },
  { id: "collection", label: "Collection Sync", Icon: RefreshCw },
  { id: "sessions", label: "Sessions", Icon: Gamepad2 },
  { id: "users", label: "Users", Icon: Users },
  { id: "players", label: "Players", Icon: UsersRound },
  { id: "locations", label: "Locations", Icon: MapPin },
  { id: "about", label: "About", Icon: Info },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

const SECTION_COMPONENTS: Record<SectionId, React.ComponentType> = {
  general: GeneralSection,
  collection: CollectionSection,
  sessions: SessionsSection,
  users: UsersSection,
  players: PlayersSection,
  locations: LocationsSection,
  about: AboutSection,
};

// ============================================================================
// Settings Content Component
// ============================================================================

function SettingsContent() {
  const searchParams = useSearchParams();
  const currentSection = (searchParams.get("section") as SectionId) || "general";
  const SectionComponent = SECTION_COMPONENTS[currentSection] || GeneralSection;

  // Get the section label for breadcrumbs
  const sectionLabel = SECTIONS.find((s) => s.id === currentSection)?.label || "General";

  return (
    <>
      <SiteHeader
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: sectionLabel },
        ]}
      />
      <div className="p-4 sm:p-6 lg:p-8 max-w-full">
        <SectionComponent />
      </div>
    </>
  );
}

// ============================================================================
// Main Settings Client Component
// ============================================================================

export function SettingsClient() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();

      // Check if user is admin
      if (!data.user || data.user.role !== "admin") {
        // Redirect non-admin users to home page
        window.location.href = "/?error=unauthorized";
        return;
      }

      setCurrentUser(data.user);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      // Redirect on error
      window.location.href = "/login?redirect=/settings";
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-pulse">
          <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Settings className="size-6 text-primary animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  // Don't render if no admin user (redirect will happen)
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-muted-foreground">Redirecting...</div>
      </div>
    );
  }

  return (
    <SettingsContext.Provider value={{ currentUser, refreshData: fetchCurrentUser }}>
      <Suspense fallback={<div className="text-muted-foreground p-8">Loading...</div>}>
        <SettingsContent />
      </Suspense>
    </SettingsContext.Provider>
  );
}
