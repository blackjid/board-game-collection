"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const Icons = {
  arrowLeft: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
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
};

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCode = searchParams.get("code") || "";

  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{
    hostName: string;
    totalGames: number;
    playerCount: number;
  } | null>(null);

  // Validate session code when provided
  useEffect(() => {
    if (code.length === 6) {
      validateSession(code);
    } else {
      setSessionInfo(null);
    }
  }, [code]);

  const validateSession = async (sessionCode: string) => {
    try {
      const response = await fetch(`/api/pick/sessions/${sessionCode}`);
      if (response.ok) {
        const data = await response.json();
        if (data.session.status !== "active") {
          setError("This session has ended");
          setSessionInfo(null);
        } else {
          setSessionInfo({
            hostName: data.session.hostName,
            totalGames: data.games.length,
            playerCount: data.players.length,
          });
          setError("");
        }
      } else {
        setError("Session not found");
        setSessionInfo(null);
      }
    } catch {
      setError("Failed to validate session");
      setSessionInfo(null);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || code.length !== 6) {
      setError("Please enter a valid 6-character session code");
      return;
    }

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/pick/sessions/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to join session");
        setLoading(false);
        return;
      }

      const data = await response.json();

      // Store player info in session storage
      sessionStorage.setItem(`player_${code}`, JSON.stringify({
        playerId: data.player.id,
        playerName: data.player.name,
        isHost: data.player.isHost,
      }));

      // Navigate to session page
      router.push(`/pick/session/${code}`);
    } catch {
      setError("Failed to join session");
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setCode(value);
    setError("");
  };

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-black to-black" />

      {/* Back Button */}
      <Link
        href="/pick"
        className="absolute top-4 left-4 z-50 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium hover:bg-white/20 transition-all flex items-center gap-2"
        style={{ top: "calc(1rem + env(safe-area-inset-top))" }}
      >
        <span className="w-4 h-4">{Icons.arrowLeft}</span> Back
      </Link>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 text-blue-400">
              {Icons.users}
            </div>
            <h1 className="text-3xl font-black mb-2">Join Game Session</h1>
            <p className="text-stone-400">
              Enter the session code to start picking games together
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleJoin} className="space-y-6">
            {/* Session Code Input */}
            <div>
              <label className="block text-sm font-medium text-stone-400 mb-2">
                Session Code
              </label>
              <input
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder="ABC123"
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-4 text-center text-3xl font-black tracking-[0.3em] text-amber-400 placeholder:text-stone-600 placeholder:tracking-[0.3em] focus:outline-none focus:border-amber-500 transition-colors"
                maxLength={6}
                autoFocus={!initialCode}
              />
            </div>

            {/* Session Info */}
            {sessionInfo && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                <p className="text-emerald-400 font-medium mb-1">
                  {sessionInfo.hostName}&apos;s Session
                </p>
                <p className="text-stone-400 text-sm">
                  {sessionInfo.totalGames} games · {sessionInfo.playerCount} player{sessionInfo.playerCount !== 1 ? "s" : ""} joined
                </p>
              </div>
            )}

            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-stone-400 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-4 text-lg text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
                maxLength={30}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Join Button */}
            <button
              type="submit"
              disabled={loading || !sessionInfo || !name.trim()}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:from-stone-700 disabled:to-stone-700 disabled:cursor-not-allowed text-black disabled:text-stone-500 py-4 rounded-full font-bold text-lg transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  Join Session
                  <span className="w-6 h-6">{Icons.dice}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  );
}
