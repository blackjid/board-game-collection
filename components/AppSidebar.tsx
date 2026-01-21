"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
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
  UsersRound,
  Pencil,
  Trash2,
  Globe,
  Share2,
  Link as LinkIcon,
  TrendingUp,
  Sparkles,
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { NavUser } from "@/components/NavUser";
import {
  CreateListDialog,
  EditListDialog,
  DeleteListDialog,
  DuplicateListDialog,
  ShareListDialog,
} from "@/components/ListDialogs";
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
  { id: "players", label: "Players", Icon: UsersRound, href: "/settings?section=players" },
  { id: "about", label: "About", Icon: Info, href: "/settings?section=about" },
] as const;

// ============================================================================
// Main AppSidebar Component
// ============================================================================

export function AppSidebar({ collections, allGamesCount, user }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedList, setSelectedList] = useState<CollectionSummary | null>(null);

  const isAdmin = user?.role === "admin";

  // Separate primary collection from different list types
  const primaryCollection = collections.find((c) => c.isPrimary);
  const manualLists = collections.filter((c) => !c.isPrimary && c.type === "manual");
  const automaticLists = collections.filter((c) => c.type === "automatic");

  // Determine active states - check if we're viewing a list by slug
  const isHomeActive = pathname === "/";
  const currentListSlug = pathname.startsWith("/lists/") ? pathname.split("/")[2] : null;
  const isPlaysActive = pathname === "/plays";
  const isSettingsActive = pathname.startsWith("/settings");
  const currentSettingsSection = searchParams.get("section") || "general";

  const handleItemClick = () => {
    setOpenMobile(false);
  };

  const handleEdit = (collection: CollectionSummary) => {
    setSelectedList(collection);
    setShowEditDialog(true);
  };

  const handleDuplicate = (collection: CollectionSummary) => {
    setSelectedList(collection);
    setShowDuplicateDialog(true);
  };

  const handleShare = (collection: CollectionSummary) => {
    setSelectedList(collection);
    setShowShareDialog(true);
  };

  const handleDelete = (collection: CollectionSummary) => {
    setSelectedList(collection);
    setShowDeleteDialog(true);
  };

  const handleListUpdated = () => {
    router.refresh();
  };

  const handleListDeleted = () => {
    router.push("/");
    router.refresh();
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

          {/* Smart Lists - Automatic/dynamic lists */}
          {automaticLists.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>
                <Sparkles className="size-3 mr-1" />
                Smart Lists
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {automaticLists.filter((collection) => collection.slug).map((collection) => {
                    const listHref = `/lists/${collection.slug}`;
                    const isActive = currentListSlug === collection.slug;

                    // Choose icon based on rule type
                    const IconComponent = collection.autoRuleType === "top_played" ? TrendingUp : Sparkles;

                    return (
                      <SidebarMenuItem key={collection.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={collection.name}
                        >
                          <Link href={listHref} onClick={handleItemClick}>
                            <IconComponent className="size-4" />
                            <span>{collection.name}</span>
                            <SidebarMenuBadge>{collection.gameCount}</SidebarMenuBadge>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
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
                  manualLists.filter((collection) => collection.slug).map((collection) => {
                    const listHref = `/lists/${collection.slug}`;
                    const isActive = currentListSlug === collection.slug;

                    return (
                    <SidebarMenuItem key={collection.id}>
                      {isAdmin ? (
                        <ContextMenu>
                          <ContextMenuTrigger asChild>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              tooltip={collection.name}
                            >
                              <Link
                                href={listHref}
                                onClick={handleItemClick}
                              >
                                <FolderHeart className="size-4" />
                                <span>{collection.name}</span>
                                {collection.isPublic ? (
                                  <span title="Public list">
                                    <Globe className="size-3 text-emerald-500" />
                                  </span>
                                ) : collection.shareToken ? (
                                  <span title="Share link enabled">
                                    <LinkIcon className="size-3 text-muted-foreground" />
                                  </span>
                                ) : null}
                                <SidebarMenuBadge>{collection.gameCount}</SidebarMenuBadge>
                              </Link>
                            </SidebarMenuButton>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem onClick={() => handleEdit(collection)}>
                              <Pencil className="size-4" />
                              Edit List
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => handleShare(collection)}>
                              <Share2 className="size-4" />
                              Share List
                              {collection.shareToken && (
                                <LinkIcon className="size-3 ml-auto text-muted-foreground" />
                              )}
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => handleDuplicate(collection)}>
                              <FolderHeart className="size-4" />
                              Duplicate List
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                              onClick={() => handleDelete(collection)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="size-4" />
                              Delete List
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      ) : (
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={collection.name}
                        >
                          <Link
                            href={listHref}
                            onClick={handleItemClick}
                          >
                            <FolderHeart className="size-4" />
                            <span>{collection.name}</span>
                            {collection.isPublic ? (
                              <span title="Public list">
                                <Globe className="size-3 text-emerald-500" />
                              </span>
                            ) : collection.shareToken ? (
                              <span title="Share link enabled">
                                <LinkIcon className="size-3 text-muted-foreground" />
                              </span>
                            ) : null}
                            <SidebarMenuBadge>{collection.gameCount}</SidebarMenuBadge>
                          </Link>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  );})
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

      {/* Dialogs */}
      <CreateListDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
      {selectedList && (
        <>
          <EditListDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            list={{
              id: selectedList.id,
              name: selectedList.name,
              slug: selectedList.slug,
              description: null,
            }}
            onUpdated={handleListUpdated}
          />
          <DuplicateListDialog
            open={showDuplicateDialog}
            onOpenChange={setShowDuplicateDialog}
            list={{
              id: selectedList.id,
              name: selectedList.name,
              slug: selectedList.slug,
              description: null,
            }}
          />
          <DeleteListDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            list={{
              id: selectedList.id,
              name: selectedList.name,
              slug: selectedList.slug,
              description: null,
            }}
            onDeleted={handleListDeleted}
          />
          <ShareListDialog
            open={showShareDialog}
            onOpenChange={setShowShareDialog}
            list={{
              id: selectedList.id,
              name: selectedList.name,
              slug: selectedList.slug,
              description: selectedList.description,
              isPublic: selectedList.isPublic,
              shareToken: selectedList.shareToken,
            }}
            onUpdated={handleListUpdated}
          />
        </>
      )}
    </>
  );
}
