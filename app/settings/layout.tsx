"use client";

import { useState, useEffect, useCallback, createContext, useContext, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Settings, Package, Users, Menu, X, LogOut, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  { id: "users", label: "Users", Icon: Users },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

// Navigation component that uses useSearchParams
function SettingsNavigation({
  currentUser,
  mobileMenuOpen,
  setMobileMenuOpen,
  onLogout,
}: {
  currentUser: CurrentUser | null;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
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
    setMobileMenuOpen(false);
  };

  const NavItems = () => (
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
            onClick={() => navigateToSection(section.id)}
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

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed left-0 top-16 bottom-0 bg-card border-r border-border">
        <NavItems />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar (Drawer) */}
      <aside
        className={cn(
          "lg:hidden fixed left-0 top-16 bottom-0 w-72 bg-card border-r border-border z-40 transform transition-transform duration-300 flex flex-col",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavItems />
      </aside>
    </>
  );
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-40 h-16">
          <div className="h-full px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/" className="gap-2">
                  <ArrowLeft className="size-4" />
                  <span className="hidden sm:inline">Back</span>
                </Link>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>
            </div>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="size-6" />
              ) : (
                <Menu className="size-6" />
              )}
            </Button>
          </div>
        </header>

        <div className="flex">
          <Suspense fallback={null}>
            <SettingsNavigation
              currentUser={currentUser}
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
              onLogout={handleLogout}
            />
          </Suspense>

          {/* Main Content */}
          <main className="flex-1 lg:ml-64 min-h-[calc(100vh-4rem)] w-full overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SettingsContext.Provider>
  );
}
