"use client";

import { useState, useEffect, useCallback, createContext, useContext, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Settings, Package, Users, LogOut, ArrowLeft, PanelLeft, Home, ChevronRight, Info, Gamepad2, FolderHeart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

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

const SECTIONS = [
  { id: "general", label: "General", Icon: Settings },
  { id: "collection", label: "Collection", Icon: Package },
  { id: "collections", label: "Lists", Icon: FolderHeart },
  { id: "sessions", label: "Sessions", Icon: Gamepad2 },
  { id: "users", label: "Users", Icon: Users },
  { id: "about", label: "About", Icon: Info },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

// Navigation items component
function NavItems({
  currentSection,
  onNavigate,
  currentUser,
  onLogout,
}: {
  currentSection: SectionId;
  onNavigate: (sectionId: string) => void;
  currentUser: CurrentUser | null;
  onLogout: () => void;
}) {
  return (
    <>
      <nav className="flex-1 p-4 space-y-1">
        {SECTIONS.map((section) => (
          <Button
            key={section.id}
            variant={currentSection === section.id ? "default" : "ghost"}
            className={cn(
              "w-full justify-start gap-3",
              currentSection === section.id && "bg-primary text-primary-foreground"
            )}
            onClick={() => onNavigate(section.id)}
          >
            <section.Icon className="size-5" />
            <span className="font-medium">{section.label}</span>
          </Button>
        ))}
      </nav>

      {currentUser && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="size-10 bg-primary">
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {(currentUser.name || currentUser.email).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {currentUser.name || currentUser.email}
              </div>
              <div className="text-xs text-muted-foreground capitalize">{currentUser.role}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={onLogout}
          >
            <LogOut className="size-4" />
            Logout
          </Button>
        </div>
      )}
    </>
  );
}

// Navigation component that uses useSearchParams
function SettingsNavigation({
  currentUser,
  sheetOpen,
  setSheetOpen,
  onLogout,
}: {
  currentUser: CurrentUser | null;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  onLogout: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSection = (searchParams.get("section") as SectionId) || "general";

  const navigateToSection = (sectionId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", sectionId);
    router.push(`${pathname}?${params.toString()}`);
    setSheetOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed left-0 top-16 bottom-0 bg-card border-r border-border">
        <NavItems
          currentSection={currentSection}
          onNavigate={navigateToSection}
          currentUser={currentUser}
          onLogout={onLogout}
        />
      </aside>

      {/* Mobile Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <Settings className="size-5" />
              Settings
            </SheetTitle>
          </SheetHeader>
          <NavItems
            currentSection={currentSection}
            onNavigate={navigateToSection}
            currentUser={currentUser}
            onLogout={onLogout}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

// Header with breadcrumbs component
function SettingsHeader({
  onOpenSheet,
}: {
  onOpenSheet: () => void;
}) {
  const searchParams = useSearchParams();
  const currentSection = (searchParams.get("section") as SectionId) || "general";
  const sectionLabel = SECTIONS.find(s => s.id === currentSection)?.label || "General";

  return (
    <header className="bg-card border-b border-border sticky top-0 z-40 h-14 sm:h-16">
      <div className="h-full px-4 flex items-center gap-3">
        {/* Mobile: Menu trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden size-9"
          onClick={onOpenSheet}
        >
          <PanelLeft className="size-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        {/* Desktop: Back button */}
        <Button variant="ghost" size="sm" asChild className="hidden lg:flex gap-2">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>

        <Separator orientation="vertical" className="h-6 hidden lg:block" />

        {/* Breadcrumb navigation */}
        <Breadcrumb className="flex-1">
          <BreadcrumbList>
            <BreadcrumbItem className="hidden sm:block">
              <BreadcrumbLink asChild>
                <Link href="/" className="flex items-center gap-1.5">
                  <Home className="size-3.5" />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:block">
              <ChevronRight className="size-3.5" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/settings" className="font-medium">Settings</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="size-3.5" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-foreground">{sectionLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Redirecting...</div>
      </div>
    );
  }

  return (
    <SettingsContext.Provider value={{ currentUser, refreshData: fetchCurrentUser }}>
      <div className="min-h-screen bg-background text-foreground">
        <Suspense fallback={null}>
          <SettingsHeader onOpenSheet={() => setSheetOpen(true)} />
        </Suspense>

        <div className="flex">
          <Suspense fallback={null}>
            <SettingsNavigation
              currentUser={currentUser}
              sheetOpen={sheetOpen}
              setSheetOpen={setSheetOpen}
              onLogout={handleLogout}
            />
          </Suspense>

          {/* Main Content */}
          <main className="flex-1 lg:ml-64 min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] w-full overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SettingsContext.Provider>
  );
}
