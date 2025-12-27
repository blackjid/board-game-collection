"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

// ============================================================================
// TYPES
// ============================================================================

interface GameData {
  id: string;
  name: string;
  yearPublished: number | null;
  image: string | null;
  description: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  minPlaytime: number | null;
  maxPlaytime: number | null;
  rating: number | null;
  minAge: number | null;
  isExpansion: boolean;
  categories: string[];
  mechanics: string[];
  componentImages: string[];
  availableImages: string[];
}

interface Filters {
  players: number | null;
  kidsPlaying: boolean | null;
  time: "quick" | "medium" | "long" | "epic" | null;
  categories: string[];
  includeExpansions: boolean;
}

type WizardStep = "welcome" | "players" | "kids" | "time" | "mood" | "expansions" | "swipe" | "picked";

// ============================================================================
// SVG ICONS
// ============================================================================

const Icons = {
  dice: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      <circle cx="16" cy="8" r="1.5" fill="currentColor" />
      <circle cx="8" cy="16" r="1.5" fill="currentColor" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  users: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  clock: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  star: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  x: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  heart: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  sparkles: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
    </svg>
  ),
  arrowLeft: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  play: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  package: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  child: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="6" r="3" />
      <path d="M12 9v3" />
      <path d="M9 21v-6a3 3 0 0 1 6 0v6" />
      <path d="M7 12h10" />
    </svg>
  ),
  adults: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="5" r="2.5" />
      <circle cx="16" cy="5" r="2.5" />
      <path d="M4 21v-5a4 4 0 0 1 8 0v5" />
      <path d="M12 21v-5a4 4 0 0 1 8 0v5" />
    </svg>
  ),
  lightning: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" stroke="none" />
    </svg>
  ),
  clockMedium: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 15 15" />
    </svg>
  ),
  clockLong: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 8 16" />
    </svg>
  ),
  castle: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 21h18" />
      <path d="M5 21V7l3-3 3 3 2-2 2 2 3-3 3 3v14" />
      <path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" />
    </svg>
  ),
  shrug: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="8" r="5" />
      <path d="M12 13v8" />
      <path d="M5 17l7-4 7 4" />
      <circle cx="10" cy="7" r="0.5" fill="currentColor" />
      <circle cx="14" cy="7" r="0.5" fill="currentColor" />
      <path d="M10 9.5h4" />
    </svg>
  ),
  check: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

// ============================================================================
// CONSTANTS
// ============================================================================

const TIME_RANGES = {
  quick: { min: 0, max: 30, label: "Quick", sublabel: "Under 30 min" },
  medium: { min: 30, max: 60, label: "Medium", sublabel: "30 to 60 min" },
  long: { min: 60, max: 120, label: "Long", sublabel: "1 to 2 hours" },
  epic: { min: 120, max: 999, label: "Epic", sublabel: "2+ hours" },
};

const PLAYER_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getPrimaryImage(game: GameData): string | null {
  return game.image;
}

function getRatingColor(rating: number): string {
  const clampedRating = Math.max(4, Math.min(8, rating));
  const normalized = (clampedRating - 4) / 4;
  if (normalized < 0.5) {
    const t = normalized * 2;
    return `rgb(220, ${Math.round(80 + t * 140)}, ${Math.round(60 - t * 20)})`;
  } else {
    const t = (normalized - 0.5) * 2;
    return `rgb(${Math.round(220 - t * 140)}, ${Math.round(180 + t * 20)}, ${Math.round(40 + t * 40)})`;
  }
}

function filterGames(games: GameData[], filters: Filters): GameData[] {
  return games.filter((game) => {
    if (filters.players !== null) {
      const min = game.minPlayers || 1;
      const max = game.maxPlayers || 99;
      if (filters.players < min || filters.players > max) {
        return false;
      }
    }

    if (filters.kidsPlaying === true) {
      const minAge = game.minAge || 0;
      if (minAge > 10) {
        return false;
      }
    }

    if (filters.time !== null) {
      const range = TIME_RANGES[filters.time];
      const gameTime = game.maxPlaytime || game.minPlaytime || 60;
      if (gameTime < range.min || gameTime > range.max) {
        return false;
      }
    }

    if (filters.categories.length > 0) {
      const gameCategories = game.categories.map((c) => c.toLowerCase());
      const hasMatch = filters.categories.some((cat) =>
        gameCategories.some((gc) => gc.includes(cat.toLowerCase()))
      );
      if (!hasMatch) {
        return false;
      }
    }

    if (!filters.includeExpansions && game.isExpansion) {
      return false;
    }

    return true;
  });
}

// ============================================================================
// GAME CARD DISPLAY COMPONENT (shared between swipe and result)
// ============================================================================

interface GameCardDisplayProps {
  game: GameData;
  showDescription?: boolean;
  swipeIndicators?: {
    showLike: boolean;
    showNope: boolean;
    showPick: boolean;
  };
}

function GameCardDisplay({ game, showDescription = false, swipeIndicators }: GameCardDisplayProps) {
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-stone-800 to-stone-900 rounded-2xl overflow-hidden">
      {/* Game Image */}
      <div className="aspect-[4/3] relative bg-stone-800 overflow-hidden">
        {getPrimaryImage(game) ? (
          <>
            {/* Blurred background layer */}
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src={getPrimaryImage(game)!}
                alt=""
                aria-hidden="true"
                fill
                sizes="500px"
                className="object-cover blur-3xl saturate-150 opacity-80 scale-[3]"
                draggable={false}
              />
            </div>

            {/* Subtle vignette overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />

            {/* Main image - shown at natural aspect ratio, never cropped */}
            <Image
              src={getPrimaryImage(game)!}
              alt={game.name}
              fill
              sizes="(max-width: 640px) 100vw, 500px"
              className="object-contain z-10 drop-shadow-lg"
              draggable={false}
            />
          </>
        ) : (
          <div className="w-full h-full bg-stone-700 flex items-center justify-center text-stone-500">
            <span className="w-8 h-8">{Icons.dice}</span>
          </div>
        )}

        {/* Swipe indicators */}
        {swipeIndicators?.showLike && (
          <div className="absolute top-6 left-4 bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-lg font-black rotate-[-15deg] border-2 border-white z-20">
            MAYBE
          </div>
        )}
        {swipeIndicators?.showNope && (
          <div className="absolute top-6 right-4 bg-red-500 text-white px-4 py-1.5 rounded-lg text-lg font-black rotate-[15deg] border-2 border-white z-20">
            NOPE
          </div>
        )}
        {swipeIndicators?.showPick && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-black px-6 py-2 rounded-lg text-lg font-black border-2 border-white flex items-center gap-2 z-20">
            THIS ONE! <span className="text-amber-900 w-5 h-5">{Icons.star}</span>
          </div>
        )}

        {/* Expansion badge */}
        {game.isExpansion && (
          <div className="absolute top-3 left-3 bg-purple-600 text-white px-2 py-0.5 rounded-full text-xs font-bold z-20">
            Expansion
          </div>
        )}
      </div>

      {/* Game Info */}
      <div className="p-5 flex flex-col items-center text-center flex-1">
        <div className="mb-3">
          <h2 className="text-2xl font-black text-white mb-1">
            {game.name}
          </h2>
          {game.yearPublished && (
            <p className="text-stone-500 text-sm">
              {game.yearPublished}
            </p>
          )}
        </div>

        <div className="mt-auto">
          {/* Stats badges - rating prominent, others subtle */}
          <div className="flex flex-wrap gap-1.5 justify-center items-center mb-3">
            {game.rating && (
              <span
                className="px-3 py-1 rounded-full flex items-center gap-1.5 font-black text-base shadow-md"
                style={{
                  backgroundColor: getRatingColor(game.rating),
                  boxShadow: `0 2px 12px ${getRatingColor(game.rating)}50`
                }}
              >
                <span className="w-4 h-4">{Icons.star}</span>
                {game.rating.toFixed(1)}
              </span>
            )}
            {game.minPlayers && game.maxPlayers && (
              <span className="bg-white/5 text-stone-400 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                <span className="w-3 h-3">{Icons.users}</span>
                {game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}-${game.maxPlayers}`}
              </span>
            )}
            {(game.minPlaytime || game.maxPlaytime) && (
              <span className="bg-white/5 text-stone-400 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                <span className="w-3 h-3">{Icons.clock}</span>
                {game.minPlaytime || game.maxPlaytime}m
              </span>
            )}
            {game.minAge && (
              <span className="bg-white/5 text-stone-400 px-2 py-1 rounded-full text-xs">
                {game.minAge}+
              </span>
            )}
          </div>

          {/* Categories */}
          {game.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center">
              {game.categories.slice(0, 3).map((cat, i) => (
                <span key={i} className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs">
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* Description (optional) */}
          {showDescription && game.description && (
            <p className="text-stone-400 text-sm line-clamp-2 mt-3">
              {game.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SWIPE CARD COMPONENT (wraps GameCardDisplay with swipe logic)
// ============================================================================

interface SwipeCardProps {
  game: GameData;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onSwipeUp: () => void;
  isTop: boolean;
}

function SwipeCard({ game, onSwipeLeft, onSwipeRight, onSwipeUp, isTop }: SwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (!isTop) return;
    setIsDragging(true);
    setStartPos({ x: clientX, y: clientY });
  }, [isTop]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    setPosition({
      x: clientX - startPos.x,
      y: clientY - startPos.y,
    });
  }, [isDragging, startPos]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = 100;
    const upThreshold = 80;

    if (position.y < -upThreshold && Math.abs(position.x) < threshold) {
      onSwipeUp();
    } else if (position.x > threshold) {
      onSwipeRight();
    } else if (position.x < -threshold) {
      onSwipeLeft();
    } else {
      setPosition({ x: 0, y: 0 });
    }
  }, [isDragging, position, onSwipeLeft, onSwipeRight, onSwipeUp]);

  const handleMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);
  const handleMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
  const handleMouseUp = () => handleEnd();
  const handleMouseLeave = () => { if (isDragging) handleEnd(); };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };
  const handleTouchEnd = () => handleEnd();

  const rotation = position.x * 0.1;
  const opacity = isTop ? 1 : 0.5;
  const scale = isTop ? 1 : 0.95;

  const showLike = position.x > 50;
  const showNope = position.x < -50;
  const showPick = position.y < -50;

  return (
    <div
      ref={cardRef}
      className={`absolute inset-0 shadow-2xl cursor-grab active:cursor-grabbing transition-transform ${isDragging ? "" : "duration-300"}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`,
        opacity,
        zIndex: isTop ? 10 : 5,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <GameCardDisplay
        game={game}
        swipeIndicators={{ showLike, showNope, showPick }}
      />
    </div>
  );
}

// ============================================================================
// WIZARD SCREEN COMPONENTS
// ============================================================================

interface WizardScreenProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

function WizardScreen({ children, title, subtitle }: WizardScreenProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-12 animate-fade-in">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-3">
          {title}
        </h1>
        {subtitle && (
          <p className="text-stone-400 text-lg mb-8">{subtitle}</p>
        )}

        <div className="mb-8">
          {children}
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// TIME ICON
// ============================================================================

function TimeIcon({ time }: { time: "quick" | "medium" | "long" | "epic" }) {
  switch (time) {
    case "quick": return <span className="text-amber-400 w-10 h-10">{Icons.lightning}</span>;
    case "medium": return <span className="text-amber-400 w-10 h-10">{Icons.clockMedium}</span>;
    case "long": return <span className="text-amber-400 w-10 h-10">{Icons.clockLong}</span>;
    case "epic": return <span className="text-amber-400 w-10 h-10">{Icons.castle}</span>;
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function GamePickerPage() {
  const [games, setGames] = useState<GameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectionName, setCollectionName] = useState("My");

  const [step, setStep] = useState<WizardStep>("welcome");
  const [filters, setFilters] = useState<Filters>({
    players: null,
    kidsPlaying: null,
    time: null,
    categories: [],
    includeExpansions: false,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [maybePile, setMaybePile] = useState<GameData[]>([]);
  const [pickedGame, setPickedGame] = useState<GameData | null>(null);
  const [swipeGames, setSwipeGames] = useState<GameData[]>([]);
  const [pickedViaLucky, setPickedViaLucky] = useState(false);

  const availableCategories = useMemo(() => {
    const catCount: Record<string, number> = {};
    games.forEach((g) => {
      g.categories.forEach((c) => {
        catCount[c] = (catCount[c] || 0) + 1;
      });
    });
    return Object.entries(catCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([cat]) => cat);
  }, [games]);

  const filteredGames = useMemo(() => {
    return filterGames(games, filters);
  }, [games, filters]);

  useEffect(() => {
    fetch("/api/pick")
      .then((res) => res.json())
      .then((data) => {
        setGames(data.games || []);
        setCollectionName(data.collectionName || "My");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Lock body scroll and enable fullscreen-like experience on mobile
  useEffect(() => {
    // Prevent body scroll
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalHeight = document.body.style.height;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.height = "100%";
    document.body.style.width = "100%";

    // Prevent pull-to-refresh and overscroll
    const preventOverscroll = (e: TouchEvent) => {
      // Allow scrolling within elements that need it
      const target = e.target as HTMLElement;
      if (target.closest("[data-allow-scroll]")) return;

      if (e.touches.length > 1) return; // Allow pinch zoom
      e.preventDefault();
    };

    document.addEventListener("touchmove", preventOverscroll, { passive: false });

    // Scroll down to hide URL bar on mobile
    window.scrollTo(0, 1);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.height = originalHeight;
      document.body.style.width = originalWidth;
      document.removeEventListener("touchmove", preventOverscroll);
    };
  }, []);

  // Navigate to a new wizard step, resetting swipe state when entering swipe mode
  const goToStep = useCallback((newStep: WizardStep, overrideFilters?: Partial<Filters>) => {
    if (newStep === "swipe") {
      // Reset swipe state when entering swipe mode
      setCurrentIndex(0);
      setMaybePile([]);
      setPickedGame(null);
      setPickedViaLucky(false);
      // Compute filtered games with any overrides (for async state updates)
      const effectiveFilters = overrideFilters ? { ...filters, ...overrideFilters } : filters;
      const gamesToSwipe = filterGames(games, effectiveFilters);
      setSwipeGames(shuffleArray(gamesToSwipe));
    }
    setStep(newStep);
  }, [filters, games]);

  const setPlayers = (n: number | null) => {
    setFilters((f) => ({ ...f, players: n }));
    if (n === 1) {
      goToStep("time");
    } else {
      goToStep("kids");
    }
  };

  const setKids = (hasKids: boolean | null) => {
    setFilters((f) => ({ ...f, kidsPlaying: hasKids }));
    goToStep("time");
  };

  const setTime = (t: Filters["time"]) => {
    setFilters((f) => ({ ...f, time: t }));
    goToStep("mood");
  };

  const toggleCategory = (cat: string) => {
    setFilters((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  const setExpansions = (include: boolean) => {
    setFilters((f) => ({ ...f, includeExpansions: include }));
    goToStep("swipe", { includeExpansions: include });
  };

  const handleSwipeLeft = useCallback(() => {
    setCurrentIndex((i) => i + 1);
  }, []);

  const handleSwipeRight = useCallback(() => {
    const game = swipeGames[currentIndex];
    if (game) {
      setMaybePile((pile) => [...pile, game]);
    }
    setCurrentIndex((i) => i + 1);
  }, [swipeGames, currentIndex]);

  const handleSwipeUp = useCallback(() => {
    const game = swipeGames[currentIndex];
    if (game) {
      setPickedGame(game);
      goToStep("picked");
    }
  }, [swipeGames, currentIndex, goToStep]);

  useEffect(() => {
    if (step !== "swipe") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handleSwipeLeft();
      if (e.key === "ArrowRight") handleSwipeRight();
      if (e.key === "ArrowUp" || e.key === " ") {
        e.preventDefault();
        handleSwipeUp();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, handleSwipeLeft, handleSwipeRight, handleSwipeUp]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-stone-400 text-lg">Loading your collection...</p>
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-center px-6">
          <h1 className="text-4xl font-black text-white mb-4">No Games Yet</h1>
          <p className="text-stone-400 mb-8">Import and scrape some games first!</p>
          <Link
            href="/settings?section=collection"
            className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 rounded-full font-bold transition-colors"
          >
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden touch-pan-x touch-pan-y" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* Floating background */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid grid-cols-6 md:grid-cols-8 gap-2 p-4">
          {games.slice(0, 24).map((game) => (
            <div key={game.id} className="aspect-square rounded-lg overflow-hidden relative">
              {getPrimaryImage(game) && (
                <Image src={getPrimaryImage(game)!} alt="" fill sizes="100px" className="object-cover" />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black" />

      {/* Back button - context aware */}
      {step === "welcome" ? (
        <Link
          href="/"
          className="absolute top-4 left-4 z-50 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium hover:bg-white/20 transition-all flex items-center gap-2"
          style={{ top: "calc(1rem + env(safe-area-inset-top))" }}
        >
          <span className="w-4 h-4">{Icons.arrowLeft}</span> Back
        </Link>
      ) : (
        <button
          onClick={() => {
            // If on picked state via "feeling lucky", go back to welcome
            if (step === "picked" && pickedViaLucky) {
              setPickedViaLucky(false);
              goToStep("welcome");
              return;
            }

            const stepOrder: Step[] = ["welcome", "players", "kids", "time", "mood", "expansions", "swipe", "picked"];
            const currentIdx = stepOrder.indexOf(step);
            if (currentIdx > 0) {
              // Skip "kids" step if solo player
              if (stepOrder[currentIdx - 1] === "kids" && filters.players === 1) {
                goToStep("players");
              } else {
                goToStep(stepOrder[currentIdx - 1]);
              }
            } else {
              goToStep("welcome");
            }
          }}
          className="absolute top-4 left-4 z-50 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium hover:bg-white/20 transition-all flex items-center gap-2"
          style={{ top: "calc(1rem + env(safe-area-inset-top))" }}
        >
          <span className="w-4 h-4">{Icons.arrowLeft}</span> Back
        </button>
      )}

      {/* Exit button - always goes to home */}
      <Link
        href="/"
        className="absolute top-4 right-4 z-50 bg-white/10 backdrop-blur-md w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all"
        style={{ top: "calc(1rem + env(safe-area-inset-top))" }}
        title="Exit to collection"
      >
        <span className="w-5 h-5 text-stone-400 hover:text-white">{Icons.x}</span>
      </Link>

      {/* Main content */}
      <div className="relative z-10 h-full">
        {/* ==================== WELCOME ==================== */}
        {step === "welcome" && (
          <WizardScreen
            title="What should we play tonight?"
            subtitle={`Choose from ${games.length} games in ${collectionName} Collection`}
          >
            <button
              onClick={() => goToStep("players")}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black px-10 py-5 rounded-full text-xl font-black transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/30 flex items-center gap-3 mx-auto"
            >
              Let&apos;s Find Out <span className="text-amber-900 w-8 h-8">{Icons.dice}</span>
            </button>

            <div className="mt-6">
              <button
                onClick={() => {
                  // Pick a random game immediately!
                  const randomGame = games[Math.floor(Math.random() * games.length)];
                  setPickedGame(randomGame);
                  setPickedViaLucky(true);
                  goToStep("picked");
                }}
                className="text-stone-500 hover:text-amber-400 transition-colors text-sm flex items-center gap-2 mx-auto"
              >
                <span className="w-4 h-4">{Icons.dice}</span>
                Feeling lucky? Pick random
              </button>
            </div>
          </WizardScreen>
        )}

        {/* ==================== PLAYER COUNT ==================== */}
        {step === "players" && (
          <WizardScreen title="How many players?">
            <div className="flex flex-wrap justify-center gap-3 max-w-lg mx-auto mb-6">
              {PLAYER_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setPlayers(n)}
                  className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 hover:bg-amber-500 border border-white/20 hover:border-amber-500 rounded-full flex items-center justify-center transition-all hover:scale-110 group"
                >
                  <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-black">
                    {n === 7 ? "7+" : n}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => { setFilters(f => ({ ...f, players: null })); goToStep("kids"); }}
              className="bg-white/10 hover:bg-white/20 border border-white/20 px-8 py-3 rounded-full text-lg font-medium transition-all"
            >
              Any number
            </button>
          </WizardScreen>
        )}

        {/* ==================== KIDS PLAYING ==================== */}
        {step === "kids" && (
          <WizardScreen
            title="Any kids playing?"
            subtitle="We'll find age-appropriate games"
          >
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <button
                onClick={() => setKids(true)}
                className="bg-white/10 hover:bg-emerald-500/20 border-2 border-transparent hover:border-emerald-500 rounded-2xl px-12 py-8 transition-all hover:scale-105"
              >
                <span className="text-emerald-400 flex justify-center mb-2 w-12 h-12 mx-auto">{Icons.child}</span>
                <span className="text-xl font-bold block">Yes</span>
                <span className="text-stone-400 text-sm block">Age 10 and under</span>
              </button>
              <button
                onClick={() => setKids(false)}
                className="bg-white/10 hover:bg-amber-500/20 border-2 border-transparent hover:border-amber-500 rounded-2xl px-12 py-8 transition-all hover:scale-105"
              >
                <span className="text-amber-400 flex justify-center mb-2 w-12 h-12 mx-auto">{Icons.adults}</span>
                <span className="text-xl font-bold block">No</span>
                <span className="text-stone-400 text-sm block">Adults only</span>
              </button>
            </div>
            <button
              onClick={() => { setKids(null); }}
              className="bg-white/10 hover:bg-white/20 border border-white/20 px-8 py-3 rounded-full text-lg font-medium transition-all"
            >
              Any age
            </button>
          </WizardScreen>
        )}

        {/* ==================== TIME AVAILABLE ==================== */}
        {step === "time" && (
          <WizardScreen title="How much time do you have?">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-6">
              {(Object.entries(TIME_RANGES) as [keyof typeof TIME_RANGES, typeof TIME_RANGES.quick][]).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setTime(key)}
                  className="bg-white/10 hover:bg-amber-500/20 border-2 border-transparent hover:border-amber-500 rounded-2xl px-6 py-6 transition-all hover:scale-105"
                >
                  <span className="flex justify-center mb-2"><TimeIcon time={key} /></span>
                  <span className="text-lg font-bold block">{value.label}</span>
                  <span className="text-stone-400 text-sm">{value.sublabel}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => { setTime(null); }}
              className="bg-white/10 hover:bg-white/20 border border-white/20 px-8 py-3 rounded-full text-lg font-medium transition-all"
            >
              Any duration
            </button>
          </WizardScreen>
        )}

        {/* ==================== MOOD / CATEGORY ==================== */}
        {step === "mood" && (
          <WizardScreen
            title="What are you in the mood for?"
            subtitle="Select one or more categories"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mb-6">
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    filters.categories.includes(cat)
                      ? "bg-amber-500 text-black"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  {filters.categories.includes(cat) && <span className="w-5 h-5">{Icons.check}</span>}
                  {cat}
                </button>
              ))}
            </div>
            <button
              onClick={() => goToStep("expansions")}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-black px-8 py-3 rounded-full font-bold transition-all hover:scale-105"
            >
              {filters.categories.length > 0 ? "Continue" : "Surprise Me!"}
            </button>
          </WizardScreen>
        )}

        {/* ==================== EXPANSIONS ==================== */}
        {step === "expansions" && (
          <WizardScreen
            title="Include expansions?"
          >
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setExpansions(true)}
                className="bg-white/10 hover:bg-purple-500/20 border-2 border-transparent hover:border-purple-500 rounded-2xl px-12 py-8 transition-all hover:scale-105"
              >
                <span className="text-purple-400 flex justify-center mb-2 w-12 h-12 mx-auto">{Icons.package}</span>
                <span className="text-xl font-bold block">Yes</span>
                <span className="text-stone-400 text-sm block">Show everything</span>
              </button>
              <button
                onClick={() => setExpansions(false)}
                className="bg-white/10 hover:bg-amber-500/20 border-2 border-transparent hover:border-amber-500 rounded-2xl px-12 py-8 transition-all hover:scale-105"
              >
                <span className="text-amber-400 flex justify-center mb-2 w-12 h-12 mx-auto">{Icons.play}</span>
                <span className="text-xl font-bold block">No</span>
                <span className="text-stone-400 text-sm block">Base games only</span>
              </button>
            </div>
          </WizardScreen>
        )}

        {/* ==================== SWIPE CARDS ==================== */}
        {step === "swipe" && (
          <div className="h-full flex flex-col pt-14 sm:pt-0">
            {/* Header with filter pills */}
            <div className="p-4 flex flex-wrap gap-2 items-center justify-center">
              <span className="text-stone-500 text-sm">
                {swipeGames.length} matches
              </span>
              {filters.players && (
                <span className="bg-white/10 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                  <span className="text-stone-400 w-3 h-3">{Icons.users}</span> {filters.players}
                </span>
              )}
              {filters.time && (
                <span className="bg-white/10 px-3 py-1 rounded-full text-xs">
                  {TIME_RANGES[filters.time].label}
                </span>
              )}
              {filters.categories.length > 0 && (
                <span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs">
                  {filters.categories.length} categories
                </span>
              )}
              <button
                onClick={() => goToStep("welcome")}
                className="text-stone-500 hover:text-white text-xs underline"
              >
                Reset
              </button>
            </div>

            {/* Card stack - centered with max dimensions */}
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="relative w-full max-w-sm h-full max-h-[32rem]">
              {swipeGames.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center px-6">
                    <span className="text-stone-600 flex justify-center mb-4 w-16 h-16 mx-auto">{Icons.shrug}</span>
                    <h2 className="text-2xl font-bold mb-2">No matches found</h2>
                    <p className="text-stone-400 mb-6">Try different filters</p>
                    <button
                      onClick={() => goToStep("welcome")}
                      className="bg-amber-500 text-black px-6 py-3 rounded-full font-bold"
                    >
                      Start Over
                    </button>
                  </div>
                </div>
              ) : currentIndex >= swipeGames.length ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center px-6">
                    <span className="text-amber-400 flex justify-center mb-4 w-16 h-16 mx-auto">{Icons.sparkles}</span>
                    <h2 className="text-2xl font-bold mb-2">You&apos;ve seen them all!</h2>
                    {maybePile.length > 0 ? (
                      <>
                        <p className="text-stone-400 mb-6">
                          You have {maybePile.length} games in your maybe pile
                        </p>
                        <button
                          onClick={() => {
                            const random = maybePile[Math.floor(Math.random() * maybePile.length)];
                            setPickedGame(random);
                            goToStep("picked");
                          }}
                          className="bg-amber-500 text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 mx-auto"
                        >
                          <span className="text-amber-900 w-6 h-6">{Icons.dice}</span>
                          Pick from Maybe Pile
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => goToStep("welcome")}
                        className="bg-amber-500 text-black px-6 py-3 rounded-full font-bold"
                      >
                        Start Over
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {swipeGames.slice(currentIndex, currentIndex + 2).map((game, i) => (
                    <SwipeCard
                      key={game.id}
                      game={game}
                      isTop={i === 0}
                      onSwipeLeft={handleSwipeLeft}
                      onSwipeRight={handleSwipeRight}
                      onSwipeUp={handleSwipeUp}
                    />
                  ))}
                </>
              )}
              </div>
            </div>

            {/* Action buttons with maybe pile indicator */}
            {currentIndex < swipeGames.length && (
              <div className="px-4 py-3 sm:p-6">
                {/* Maybe pile indicator - clickable when has games */}
                <div className="flex items-center justify-center mb-4 sm:mb-5">
                  {maybePile.length > 0 ? (
                    <button
                      onClick={() => {
                        const random = maybePile[Math.floor(Math.random() * maybePile.length)];
                        setPickedGame(random);
                        goToStep("picked");
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:scale-105 border border-emerald-500/30"
                    >
                      <span className="w-4 h-4">{Icons.heart}</span>
                      <span className="text-sm font-medium">
                        {maybePile.length} {maybePile.length === 1 ? 'maybe' : 'maybes'}
                      </span>
                      <span className="text-emerald-300 font-bold">• Pick one!</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-stone-800/50 text-stone-500">
                      <span className="w-4 h-4">{Icons.heart}</span>
                      <span className="text-sm">Swipe right to save games</span>
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-center gap-4 sm:gap-6">
                  <button
                    onClick={handleSwipeLeft}
                    className="w-12 h-12 sm:w-16 sm:h-16 bg-red-500/20 hover:bg-red-500/40 rounded-full flex items-center justify-center text-red-400 transition-all hover:scale-110"
                  >
                    <span className="w-6 h-6 sm:w-8 sm:h-8">{Icons.x}</span>
                  </button>
                  <button
                    onClick={handleSwipeUp}
                    className="w-14 h-14 sm:w-20 sm:h-20 bg-amber-500 hover:bg-amber-400 rounded-full flex items-center justify-center text-amber-900 transition-all hover:scale-110 shadow-lg shadow-amber-500/30"
                  >
                    <span className="w-6 h-6 sm:w-8 sm:h-8">{Icons.star}</span>
                  </button>
                  <button
                    onClick={handleSwipeRight}
                    className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-500/20 hover:bg-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 transition-all hover:scale-110"
                  >
                    <span className="w-5 h-5 sm:w-7 sm:h-7">{Icons.heart}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Progress bar */}
            {currentIndex < swipeGames.length && (
              <div className="px-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                      style={{ width: `${((currentIndex + 1) / swipeGames.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-stone-500 text-xs whitespace-nowrap">
                    {currentIndex + 1} / {swipeGames.length}
                  </span>
                </div>
              </div>
            )}
            <div className="pb-4 text-center text-stone-600 text-xs hidden sm:block">
              Use arrow keys: Left = Skip, Up = Pick, Right = Maybe
            </div>
          </div>
        )}

        {/* ==================== PICKED GAME ==================== */}
        {step === "picked" && pickedGame && (
          <div className="h-full flex flex-col pt-16 pb-4 px-4 sm:justify-center sm:pt-6 sm:px-6" data-allow-scroll>
            <div className="max-w-md w-full mx-auto text-center animate-scale-in flex-1 flex flex-col justify-center overflow-auto">
              <h1 className="text-sm sm:text-lg font-medium text-stone-500 mb-2 sm:mb-4 flex-shrink-0">Tonight you&apos;re playing...</h1>

              {/* Game card - using shared component */}
              <div className="shadow-2xl rounded-2xl overflow-hidden mb-4 sm:mb-8 flex-shrink min-h-0">
                <GameCardDisplay
                  game={pickedGame}
                  showDescription={false}
                />
              </div>

              <button
                onClick={() => goToStep("welcome")}
                className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 sm:px-8 sm:py-4 rounded-full font-bold text-base sm:text-lg transition-all flex items-center gap-2 justify-center mx-auto flex-shrink-0"
              >
                Let&apos;s Play! <span className="w-5 h-5">{Icons.dice}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
