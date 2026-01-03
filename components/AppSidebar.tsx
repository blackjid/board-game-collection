"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Library,
  FolderHeart,
  Plus,
  Star,
  RefreshCw,
  Users,
  Gamepad2,
  Info,
  Settings,
  X,
  History,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/NavUser";
import { CreateListDialog } from "@/components/ListDialogs";
import type { CollectionSummary } from "@/lib/games";

// ============================================================================
// Types
// ============================================================================

export interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export interface AppSidebarProps {
  collections: CollectionSummary[];
  allGamesCount: number;
  user: CurrentUser | null;
}

// ============================================================================
// Admin Settings Menu Items
// ============================================================================

const ADMIN_SECTIONS = [
  { id: "general", label: "General", Icon: Settings, href: "/settings" },
  { id: "collection", label: "Collection Sync", Icon: RefreshCw, href: "/settings?section=collection" },
  { id: "sessions", label: "Sessions", Icon: Gamepad2, href: "/settings?section=sessions" },
  { id: "users", label: "Users", Icon: Users, href: "/settings?section=users" },
  { id: "about", label: "About", Icon: Info, href: "/settings?section=about" },
] as const;

// ============================================================================
// Main AppSidebar Component
// ============================================================================

export function AppSidebar({ collections, allGamesCount, user }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setOpenMobile } = useSidebar();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const isAdmin = user?.role === "admin";

  // Get current collection ID from URL
  const selectedCollectionId = searchParams.get("collection");

  // Separate primary collection from manual lists
  const primaryCollection = collections.find((c) => c.isPrimary);
  const manualLists = collections.filter((c) => !c.isPrimary && c.type === "manual");

  // Determine active states
  const isHomeActive = pathname === "/" && !selectedCollectionId;
  const isPlaysActive = pathname === "/plays";
  const isSettingsActive = pathname.startsWith("/settings");
  const currentSettingsSection = searchParams.get("section") || "general";

  const handleItemClick = () => {
    setOpenMobile(false);
  };

  return (
    <>
      <Sidebar>
        {/* Header - Primary Collection */}
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
                isActive={isHomeActive}
                size="lg"
                tooltip="My Collection"
              >
                <Link href="/" onClick={handleItemClick}>
                  <div className="relative flex-shrink-0">
                    <Library className="size-4" />
                    <Star className="size-2 absolute -top-1 -right-1 text-amber-500 fill-amber-500" />
                  </div>
                  <span className="font-semibold">
                    {primaryCollection?.name || "My Collection"}
                  </span>
                  <SidebarMenuBadge>{allGamesCount}</SidebarMenuBadge>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {/* Play History - visible to logged in users */}
          {user && (
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isPlaysActive}
                      tooltip="Play History"
                    >
                      <Link href="/plays" onClick={handleItemClick}>
                        <History className="size-4" />
                        <span>Play History</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Lists Group */}
          <SidebarGroup>
            <SidebarGroupLabel>Lists</SidebarGroupLabel>
            {isAdmin && (
              <SidebarGroupAction
                onClick={() => setShowCreateDialog(true)}
                title="Create new list"
              >
                <Plus />
                <span className="sr-only">Create new list</span>
              </SidebarGroupAction>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {manualLists.length === 0 ? (
                  <div className="px-2 py-4 text-sm text-sidebar-foreground/50 text-center">
                    No lists yet
                  </div>
                ) : (
                  manualLists.map((collection) => (
                    <SidebarMenuItem key={collection.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={selectedCollectionId === collection.id}
                        tooltip={collection.name}
                      >
                        <Link
                          href={`/?collection=${collection.id}`}
                          onClick={handleItemClick}
                        >
                          <FolderHeart className="size-4" />
                          <span>{collection.name}</span>
                          <SidebarMenuBadge>{collection.gameCount}</SidebarMenuBadge>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Admin Section - Only visible to admins */}
          {isAdmin && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Admin</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {ADMIN_SECTIONS.map((section) => {
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
            </>
          )}
        </SidebarContent>

        {/* Footer - User Profile */}
        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
      </Sidebar>

      {/* Create List Dialog */}
      <CreateListDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  );
}
