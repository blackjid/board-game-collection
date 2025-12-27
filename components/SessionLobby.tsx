"use client";

import type { PlayerInfo } from "@/lib/socket-events";

interface SessionLobbyProps {
  sessionCode: string;
  players: PlayerInfo[];
  totalGames: number;
  isHost: boolean;
  onShowQR: () => void;
  onStartPicking: () => void;
}

const Icons = {
  users: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  qrCode: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="3" height="3" />
      <rect x="18" y="14" width="3" height="3" />
      <rect x="14" y="18" width="3" height="3" />
      <rect x="18" y="18" width="3" height="3" />
    </svg>
  ),
  crown: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  ),
  check: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  loader: (
    <svg className="w-full h-full animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  ),
  play: (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
};

export default function SessionLobby({
  sessionCode,
  players,
  totalGames,
  isHost,
  onShowQR,
  onStartPicking,
}: SessionLobbyProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-12 animate-fade-in">
      <div className="max-w-md w-full text-center">
        {/* Session Code Header */}
        <div className="mb-8">
          <p className="text-stone-500 text-sm uppercase tracking-wider mb-2">Session Code</p>
          <h1 className="text-4xl font-black tracking-[0.3em] text-amber-400 mb-2">
            {sessionCode}
          </h1>
          <p className="text-stone-400 text-sm">
            {totalGames} games to pick from
          </p>
        </div>

        {/* Players List */}
        <div className="bg-stone-800/50 rounded-2xl p-6 mb-8 border border-stone-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-stone-400">
              <span className="w-5 h-5">{Icons.users}</span>
              <span className="font-medium">Players ({players.length})</span>
            </div>
            {isHost && (
              <button
                onClick={onShowQR}
                className="flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
              >
                <span className="w-4 h-4">{Icons.qrCode}</span>
                Share
              </button>
            )}
          </div>

          <div className="space-y-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between bg-stone-900/50 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                    player.isHost
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white flex items-center gap-2">
                      {player.name}
                      {player.isHost && (
                        <span className="w-4 h-4 text-amber-400">{Icons.crown}</span>
                      )}
                    </p>
                    <p className="text-stone-500 text-xs">
                      {player.status === "done" ? "Ready" : "Waiting..."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {player.status === "done" ? (
                    <span className="w-5 h-5 text-emerald-400">{Icons.check}</span>
                  ) : (
                    <span className="w-5 h-5 text-stone-500">{Icons.loader}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {players.length === 1 && (
            <p className="text-stone-500 text-sm mt-4 italic">
              Waiting for more players to join...
            </p>
          )}
        </div>

        {/* Start Button (host only) */}
        {isHost && (
          <button
            onClick={onStartPicking}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black px-10 py-5 rounded-full text-xl font-black transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/30 flex items-center gap-3 mx-auto"
          >
            Start Picking <span className="text-amber-900 w-8 h-8">{Icons.play}</span>
          </button>
        )}

        {!isHost && (
          <div className="bg-stone-800/50 rounded-2xl p-6 border border-stone-700">
            <p className="text-stone-400">
              Waiting for the host to start the session...
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
