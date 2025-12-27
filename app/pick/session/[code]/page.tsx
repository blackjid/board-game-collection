"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket-client";
import type { PlayerInfo, SessionInfo } from "@/lib/socket-events";
import QRCodeModal from "@/components/QRCodeModal";
import SessionLobby from "@/components/SessionLobby";
import SessionResults from "@/components/SessionResults";

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
}

interface GameResult {
  id: string;
  name: string;
  image: string | null;
  rating: number | null;
  likes: number;
  picks: number;
  skips: number;
  likedBy: string[];
  pickedBy: string[];
  isUnanimous: boolean;
}

interface ResultsData {
  unanimousMatches: GameResult[];
  rankedResults: GameResult[];
}

type SessionPhase = "loading" | "lobby" | "picking" | "waiting" | "results";

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
  arrowLeft: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  check: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

// ============================================================================
// GAME CARD DISPLAY COMPONENT
// ============================================================================

interface GameCardDisplayProps {
  game: GameData;
  swipeIndicators?: {
    showLike: boolean;
    showNope: boolean;
    showPick: boolean;
  };
}

function GameCardDisplay({ game, swipeIndicators }: GameCardDisplayProps) {
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-stone-800 to-stone-900 rounded-2xl overflow-hidden">
      {/* Game Image */}
      <div className="aspect-[4/3] relative bg-stone-800 overflow-hidden">
        {game.image ? (
          <>
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src={game.image}
                alt=""
                aria-hidden="true"
                fill
                sizes="500px"
                className="object-cover blur-3xl saturate-150 opacity-80 scale-[3]"
                draggable={false}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />
            <Image
              src={game.image}
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
          <div className="absolute inset-0 bg-emerald-500/20 z-20 flex items-center justify-center pointer-events-none">
            <div className="bg-emerald-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-2xl flex items-center gap-3">
              <span className="w-8 h-8">{Icons.heart}</span>
              <span className="text-2xl font-bold">Maybe</span>
            </div>
          </div>
        )}
        {swipeIndicators?.showNope && (
          <div className="absolute inset-0 bg-red-500/20 z-20 flex items-center justify-center pointer-events-none">
            <div className="bg-red-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-2xl flex items-center gap-3">
              <span className="w-8 h-8">{Icons.x}</span>
              <span className="text-2xl font-bold">Nope</span>
            </div>
          </div>
        )}
        {swipeIndicators?.showPick && (
          <div className="absolute inset-0 bg-amber-500/30 z-20 flex items-center justify-center pointer-events-none">
            <div className="bg-amber-500 text-black px-8 py-4 rounded-2xl flex items-center gap-3 shadow-xl">
              <span className="w-8 h-8">{Icons.star}</span>
              <span className="text-2xl font-black">This one!</span>
            </div>
          </div>
        )}

        {game.isExpansion && (
          <div className="absolute top-3 left-3 bg-purple-600 text-white px-2 py-0.5 rounded-full text-xs font-bold z-20">
            Expansion
          </div>
        )}
      </div>

      {/* Game Info */}
      <div className="p-5 flex flex-col items-center text-center flex-1">
        <div className="mb-3">
          <h2 className="text-2xl font-black text-white mb-1">{game.name}</h2>
          {game.yearPublished && (
            <p className="text-stone-500 text-sm">{game.yearPublished}</p>
          )}
        </div>

        <div className="mt-auto">
          <div className="flex flex-wrap gap-1.5 justify-center items-center mb-3">
            {game.rating && (
              <span
                className="px-3 py-1 rounded-full flex items-center gap-1.5 font-black text-base shadow-md"
                style={{
                  backgroundColor: getRatingColor(game.rating),
                  boxShadow: `0 2px 12px ${getRatingColor(game.rating)}50`,
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
          </div>

          {game.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center">
              {game.categories.slice(0, 3).map((cat, i) => (
                <span key={i} className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs">
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SWIPE CARD COMPONENT
// ============================================================================

interface SwipeCardProps {
  game: GameData;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTop: boolean;
}

function SwipeCard({ game, onSwipeLeft, onSwipeRight, isTop }: SwipeCardProps) {
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

    if (position.x > threshold) {
      onSwipeRight();
    } else if (position.x < -threshold) {
      onSwipeLeft();
    } else {
      setPosition({ x: 0, y: 0 });
    }
  }, [isDragging, position, onSwipeLeft, onSwipeRight]);

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
      <GameCardDisplay game={game} swipeIndicators={{ showLike, showNope, showPick: false }} />
    </div>
  );
}

// ============================================================================
// PLAYER PROGRESS BAR
// ============================================================================

function PlayerProgressBar({ players, totalGames }: { players: PlayerInfo[]; totalGames: number }) {
  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      {players.map((player) => (
        <div
          key={player.id}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
            player.status === "done"
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-stone-800 text-stone-400"
          }`}
        >
          <span className="font-medium">{player.name}</span>
          {player.status === "done" ? (
            <span className="w-4 h-4">{Icons.check}</span>
          ) : (
            <span className="text-stone-500">{player.progress}/{totalGames}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN SESSION PAGE COMPONENT
// ============================================================================

interface PageParams {
  code: string;
}

export default function SessionPage({ params }: { params: Promise<PageParams> }) {
  const { code } = use(params);
  const router = useRouter();

  const [phase, setPhase] = useState<SessionPhase>("loading");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [games, setGames] = useState<GameData[]>([]);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [results, setResults] = useState<ResultsData | null>(null);

  const [playerId, setPlayerId] = useState<string>("");
  const [isHost, setIsHost] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showQR, setShowQR] = useState(false);

  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  // Load session data and player info
  useEffect(() => {
    const loadSession = async () => {
      // Check for player info in session storage
      const storedPlayer = sessionStorage.getItem(`player_${code}`);
      if (!storedPlayer) {
        // Redirect to join page if not in session
        router.push(`/pick/join?code=${code}`);
        return;
      }

      const playerData = JSON.parse(storedPlayer);
      setPlayerId(playerData.playerId);
      setIsHost(playerData.isHost);

      // Fetch session data
      try {
        const response = await fetch(`/api/pick/sessions/${code}`);
        if (!response.ok) {
          router.push("/pick");
          return;
        }

        const data = await response.json();

        if (data.session.status === "completed") {
          // Load results
          const resultsResponse = await fetch(`/api/pick/sessions/${code}/results`);
          if (resultsResponse.ok) {
            const resultsData = await resultsResponse.json();
            setResults({
              unanimousMatches: resultsData.unanimousMatches,
              rankedResults: resultsData.rankedResults,
            });
            setPlayers(resultsData.players);
          }
          setPhase("results");
          return;
        }

        setSessionInfo({
          code: data.session.code,
          hostName: data.session.hostName,
          status: data.session.status,
          totalGames: data.games.length,
          players: data.players,
        });
        setGames(data.games);
        setPlayers(data.players);

        // Find current player's progress
        const currentPlayer = data.players.find((p: PlayerInfo) => p.id === playerData.playerId);
        if (currentPlayer) {
          setCurrentIndex(currentPlayer.progress);
        }

        setPhase("lobby");
      } catch (error) {
        console.error("Failed to load session:", error);
        router.push("/pick");
      }
    };

    loadSession();
  }, [code, router]);

  // Setup WebSocket connection
  useEffect(() => {
    if (!playerId || phase === "loading") return;

    const socket = connectSocket();
    socketRef.current = socket;

    socket.emit("join-session", { sessionCode: code, playerId });

    socket.on("session-update", (data) => {
      setSessionInfo(data);
      setPlayers(data.players);
    });

    socket.on("player-joined", (player) => {
      setPlayers((prev) => {
        if (prev.find((p) => p.id === player.id)) return prev;
        return [...prev, player];
      });
    });

    socket.on("player-progress-update", ({ playerId: pid, progress }) => {
      setPlayers((prev) =>
        prev.map((p) => (p.id === pid ? { ...p, progress } : p))
      );
    });

    socket.on("player-completed", ({ playerId: pid }) => {
      setPlayers((prev) =>
        prev.map((p) => (p.id === pid ? { ...p, status: "done" } : p))
      );
    });

    socket.on("picking-started", () => {
      // Host has started the picking phase - all players should start
      setPhase("picking");
    });

    socket.on("session-ended", async () => {
      // Load results
      try {
        const resultsResponse = await fetch(`/api/pick/sessions/${code}/results`);
        if (resultsResponse.ok) {
          const resultsData = await resultsResponse.json();
          setResults({
            unanimousMatches: resultsData.unanimousMatches,
            rankedResults: resultsData.rankedResults,
          });
          setPlayers(resultsData.players);
        }
      } catch (error) {
        console.error("Failed to load results:", error);
      }
      setPhase("results");
    });

    return () => {
      disconnectSocket();
    };
  }, [code, playerId, phase]);

  // Mark player as done (can be called when finishing all games or clicking "Done" early)
  const markPlayerDone = useCallback(async () => {
    try {
      await fetch(`/api/pick/sessions/${code}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });

      socketRef.current?.emit("player-done", {
        sessionCode: code,
        playerId,
      });

      setPhase("waiting");
    } catch (error) {
      console.error("Failed to mark player as done:", error);
    }
  }, [code, playerId]);

  // Handle swipe actions (collaborative mode only uses like/skip)
  const handleSwipe = useCallback(async (decision: "like" | "skip") => {
    if (currentIndex >= games.length) return;

    const game = games[currentIndex];
    const newProgress = currentIndex + 1;

    // Submit vote
    try {
      await fetch(`/api/pick/sessions/${code}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          gameId: game.id,
          decision,
          progress: newProgress,
        }),
      });

      // Emit progress update
      socketRef.current?.emit("player-progress", {
        sessionCode: code,
        playerId,
        progress: newProgress,
      });

      setCurrentIndex(newProgress);

      // Check if done
      if (newProgress >= games.length) {
        await markPlayerDone();
      }
    } catch (error) {
      console.error("Failed to submit vote:", error);
    }
  }, [code, currentIndex, games, playerId, markPlayerDone]);

  const handleSwipeLeft = useCallback(() => handleSwipe("skip"), [handleSwipe]);
  const handleSwipeRight = useCallback(() => handleSwipe("like"), [handleSwipe]);

  // Handle keyboard navigation (only left/right in collaborative mode)
  useEffect(() => {
    if (phase !== "picking") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handleSwipeLeft();
      if (e.key === "ArrowRight") handleSwipeRight();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, handleSwipeLeft, handleSwipeRight]);

  // Handle host actions
  const handleStartPicking = () => {
    // Emit event to notify all players that picking has started
    socketRef.current?.emit("start-picking", { sessionCode: code });
    setPhase("picking");
  };

  const handleEndSession = async () => {
    try {
      await fetch(`/api/pick/sessions/${code}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });

      socketRef.current?.emit("end-session", { sessionCode: code, playerId });
    } catch (error) {
      console.error("Failed to end session:", error);
    }
  };

  const handleClose = () => {
    router.push("/");
  };

  // Lock body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
    };
  }, []);

  if (phase === "loading") {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-stone-400 text-lg">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-black text-white ${phase === "results" ? "overflow-y-auto" : "overflow-hidden"}`} style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-black to-black" />

      {/* Exit button */}
      <Link
        href="/"
        className="absolute top-4 right-4 z-50 bg-white/10 backdrop-blur-md w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all"
        style={{ top: "calc(1rem + env(safe-area-inset-top))" }}
        title="Exit to collection"
      >
        <span className="w-5 h-5 text-stone-400 hover:text-white">{Icons.x}</span>
      </Link>

      {/* QR Modal */}
      {showQR && (
        <QRCodeModal sessionCode={code} onClose={() => setShowQR(false)} />
      )}

      {/* Main content */}
      <div className="relative z-10 h-full">
        {/* LOBBY PHASE */}
        {phase === "lobby" && sessionInfo && (
          <SessionLobby
            sessionCode={code}
            players={players}
            totalGames={games.length}
            isHost={isHost}
            onShowQR={() => setShowQR(true)}
            onStartPicking={handleStartPicking}
          />
        )}

        {/* PICKING PHASE */}
        {phase === "picking" && (
          <div className="h-full flex flex-col pt-14 sm:pt-0">
            {/* Header with player progress */}
            <div className="p-4 flex flex-col gap-2 items-center">
              <div className="flex items-center gap-2 text-stone-500 text-sm">
                <span className="w-4 h-4">{Icons.users}</span>
                Session {code}
              </div>
              <PlayerProgressBar players={players} totalGames={games.length} />
            </div>

            {/* Card stack */}
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="relative w-full max-w-sm h-full max-h-[32rem]">
                {currentIndex >= games.length ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center px-6">
                      <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                      <h2 className="text-2xl font-bold mb-2">You&apos;re Done!</h2>
                      <p className="text-stone-400">Waiting for other players...</p>
                    </div>
                  </div>
                ) : (
                  games.slice(currentIndex, currentIndex + 2).map((game, i) => (
                    <SwipeCard
                      key={game.id}
                      game={game}
                      isTop={i === 0}
                      onSwipeLeft={handleSwipeLeft}
                      onSwipeRight={handleSwipeRight}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Action buttons */}
            {currentIndex < games.length && (
              <div className="px-4 py-3 sm:p-6">
                <div className="flex items-center justify-center gap-6 sm:gap-8">
                  <button
                    onClick={handleSwipeLeft}
                    className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500/20 hover:bg-red-500/40 rounded-full flex items-center justify-center text-red-400 transition-all hover:scale-110"
                  >
                    <span className="w-8 h-8 sm:w-10 sm:h-10">{Icons.x}</span>
                  </button>
                  <button
                    onClick={handleSwipeRight}
                    className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/20 hover:bg-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 transition-all hover:scale-110"
                  >
                    <span className="w-8 h-8 sm:w-10 sm:h-10">{Icons.heart}</span>
                  </button>
                </div>
                {/* Done early button */}
                <button
                  onClick={markPlayerDone}
                  className="mt-4 mx-auto block text-stone-500 hover:text-amber-400 text-sm transition-colors"
                >
                  Done picking? Finish now →
                </button>
              </div>
            )}

            {/* Progress bar */}
            <div className="px-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / games.length) * 100}%` }}
                  />
                </div>
                <span className="text-stone-500 text-xs whitespace-nowrap">
                  {currentIndex + 1} / {games.length}
                </span>
              </div>
            </div>

            {/* End session button (host only) */}
            {isHost && (
              <div className="px-6 pb-4">
                <button
                  onClick={handleEndSession}
                  className="w-full bg-stone-800 hover:bg-stone-700 text-stone-400 py-3 rounded-xl font-medium transition-colors"
                >
                  End Session & Show Results
                </button>
              </div>
            )}
          </div>
        )}

        {/* WAITING PHASE */}
        {phase === "waiting" && (
          <div className="h-full flex flex-col items-center justify-center px-6">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-4">You&apos;re Done!</h2>
              <p className="text-stone-400 mb-8">Waiting for other players to finish...</p>

              <PlayerProgressBar players={players} totalGames={games.length} />

              {isHost && (
                <button
                  onClick={handleEndSession}
                  className="mt-8 bg-amber-500 hover:bg-amber-400 text-black px-8 py-4 rounded-full font-bold transition-colors"
                >
                  End Session & Show Results
                </button>
              )}
            </div>
          </div>
        )}

        {/* RESULTS PHASE */}
        {phase === "results" && results && (
          <SessionResults
            sessionCode={code}
            players={players}
            unanimousMatches={results.unanimousMatches}
            rankedResults={results.rankedResults}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
}
