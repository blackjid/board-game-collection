"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Settings,
  RefreshCw,
  Users,
  Gamepad2,
  Info,
  UsersRound,
  MapPin,
  X,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

// ============================================================================
// Settings Sections Configuration
// ============================================================================

const SETTINGS_SECTIONS = [
  { id: "general", label: "General", Icon: Settings, href: "/settings" },
  { id: "collection", label: "Collection Sync", Icon: RefreshCw, href: "/settings?section=collection" },
  { id: "sessions", label: "Sessions", Icon: Gamepad2, href: "/settings?section=sessions" },
  { id: "users", label: "Users", Icon: Users, href: "/settings?section=users" },
  { id: "players", label: "Players", Icon: UsersRound, href: "/settings?section=players" },
  { id: "locations", label: "Locations", Icon: MapPin, href: "/settings?section=locations" },
  { id: "about", label: "About", Icon: Info, href: "/settings?section=about" },
] as const;

// ============================================================================
// Main SettingsSidebar Component
// ============================================================================

export function SettingsSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setOpenMobile } = useSidebar();

  const isSettingsActive = pathname.startsWith("/settings");
  const currentSettingsSection = searchParams.get("section") || "general";

  const handleItemClick = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar>
      {/* Header - Back to App + Settings Title */}
      <SidebarHeader className="border-b border-sidebar-border relative">
        {/* Mobile close button */}
        <button
          onClick={() => setOpenMobile(false)}
          className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors md:hidden"
          aria-label="Close sidebar"
        >
          <X className="size-4" />
        </button>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="Back to Collection"
            >
              <Link href="/" onClick={handleItemClick}>
                <div className="flex-shrink-0">
                  <ArrowLeft className="size-4" />
                </div>
                <span className="font-semibold">Back to Collection</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Settings Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {SETTINGS_SECTIONS.map((section) => {
                const isActive =
                  isSettingsActive &&
                  (section.id === "general"
                    ? currentSettingsSection === "general"
                    : currentSettingsSection === section.id);

                return (
                  <SidebarMenuItem key={section.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={section.label}
                    >
                      <Link href={section.href} onClick={handleItemClick}>
                        <section.Icon className="size-4" />
                        <span>{section.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

    </Sidebar>
  );
}
