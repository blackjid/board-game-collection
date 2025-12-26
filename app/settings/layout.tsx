"use client";

import { useState, useEffect, useCallback, createContext, useContext, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

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

// SVG Icon components
function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function CollectionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

const SECTIONS = [
  { id: "general", label: "General", Icon: GearIcon },
  { id: "collection", label: "Collection", Icon: CollectionIcon },
  { id: "users", label: "Users", Icon: UsersIcon },
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

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed left-0 top-16 bottom-0 bg-stone-900 border-r border-stone-800">
        <nav className="flex-1 p-4 space-y-1">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => navigateToSection(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                currentSection === section.id
                  ? "bg-amber-600 text-white"
                  : "text-stone-400 hover:text-white hover:bg-stone-800"
              }`}
            >
              <section.Icon className="w-5 h-5" />
              <span className="font-medium">{section.label}</span>
            </button>
          ))}
        </nav>

        {currentUser && (
          <div className="p-4 border-t border-stone-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold">
                {(currentUser.name || currentUser.email).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {currentUser.name || currentUser.email}
                </div>
                <div className="text-xs text-stone-400 capitalize">{currentUser.role}</div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full px-3 py-2 text-sm text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors text-center"
            >
              Logout
            </button>
          </div>
        )}
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
        className={`lg:hidden fixed left-0 top-16 bottom-0 w-72 bg-stone-900 border-r border-stone-800 z-40 transform transition-transform duration-300 flex flex-col ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="flex-1 p-4 space-y-1">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => navigateToSection(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                currentSection === section.id
                  ? "bg-amber-600 text-white"
                  : "text-stone-400 hover:text-white hover:bg-stone-800"
              }`}
            >
              <section.Icon className="w-5 h-5" />
              <span className="font-medium">{section.label}</span>
            </button>
          ))}
        </nav>

        {currentUser && (
          <div className="p-4 border-t border-stone-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold">
                {(currentUser.name || currentUser.email).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {currentUser.name || currentUser.email}
                </div>
                <div className="text-xs text-stone-400 capitalize">{currentUser.role}</div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full px-3 py-2 text-sm text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors text-center"
            >
              Logout
            </button>
          </div>
        )}
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
      setCurrentUser(data.user);
    } catch (error) {
      console.error("Failed to fetch user:", error);
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
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <SettingsContext.Provider value={{ currentUser, refreshData: fetchCurrentUser }}>
      <div className="min-h-screen bg-stone-950 text-white">
        {/* Header */}
        <header className="bg-stone-900 border-b border-stone-800 sticky top-0 z-40 h-16">
          <div className="h-full px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/"
                className="text-stone-400 hover:text-white transition-colors"
              >
                ← Back
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-stone-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
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
