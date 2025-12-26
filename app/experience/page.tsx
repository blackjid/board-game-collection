"use client";

import { useEffect, useState, useMemo } from "react";
import gamesData from "@/data/games.json";
import Link from "next/link";

// Calculate rating color
function getRatingColor(rating: number): string {
  const clampedRating = Math.max(4, Math.min(8, rating));
  const normalized = (clampedRating - 4) / 4;
  let r, g, b;
  if (normalized < 0.5) {
    const t = normalized * 2;
    r = 220;
    g = Math.round(80 + t * 140);
    b = Math.round(60 - t * 20);
  } else {
    const t = (normalized - 0.5) * 2;
    r = Math.round(220 - t * 140);
    g = Math.round(180 + t * 20);
    b = Math.round(40 + t * 40);
  }
  return `rgb(${r}, ${g}, ${b})`;
}

// Seeded random for consistent positioning
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export default function ExperiencePage() {
  const { games, username, totalGames } = gamesData;
  const [scrollY, setScrollY] = useState(0);
  const [windowHeight, setWindowHeight] = useState(1);
  const [docHeight, setDocHeight] = useState(1);
  const [suggestedGame, setSuggestedGame] = useState<typeof games[0] | null>(null);
  const [hoveredGallery, setHoveredGallery] = useState<string | null>(null);

  // Sort games by rating
  const sortedGames = useMemo(() =>
    [...games].sort((a, b) => {
      if (a.rating === null) return 1;
      if (b.rating === null) return -1;
      return b.rating - a.rating;
    }), [games]
  );

  // Pre-calculate floating thumbnail positions (stable across renders)
  const floatingPositions = useMemo(() =>
    sortedGames.slice(0, 20).map((game, i) => ({
      left: 5 + (i % 5) * 18 + seededRandom(i * 7) * 8,
      top: 5 + Math.floor(i / 5) * 22 + seededRandom(i * 13) * 8,
      rotation: -12 + seededRandom(i * 17) * 24,
      delay: seededRandom(i * 23) * 2,
    })), [sortedGames]
  );

  // Top games for showcase
  const showcaseGames = sortedGames.slice(0, 12);

  // Calculate stats
  const stats = useMemo(() => {
    const withRating = games.filter(g => g.rating);
    const avgRating = withRating.length > 0
      ? withRating.reduce((acc, g) => acc + (g.rating || 0), 0) / withRating.length
      : 0;
    const oldestGame = games.reduce((oldest, g) => (!oldest.yearPublished || (g.yearPublished && g.yearPublished < oldest.yearPublished)) ? g : oldest, games[0]);
    const newestGame = games.reduce((newest, g) => (!newest.yearPublished || (g.yearPublished && g.yearPublished > newest.yearPublished)) ? g : newest, games[0]);
    const totalYears = newestGame.yearPublished && oldestGame.yearPublished ? newestGame.yearPublished - oldestGame.yearPublished : 0;
    return { avgRating, oldestGame, newestGame, totalYears };
  }, [games]);

  // Pick a random game
  const pickRandomGame = () => {
    const randomIndex = Math.floor(Math.random() * games.length);
    setSuggestedGame(games[randomIndex]);
  };

  useEffect(() => {
    const updateDimensions = () => {
      setWindowHeight(window.innerHeight);
      setDocHeight(document.documentElement.scrollHeight);
    };

    updateDimensions();

    const handleScroll = () => {
      setScrollY(window.scrollY);
      // Update doc height on scroll in case content changed
      setDocHeight(document.documentElement.scrollHeight);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateDimensions);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  const scrollProgress = docHeight > windowHeight ? scrollY / (docHeight - windowHeight) : 0;

  return (
    <div className="bg-black text-white overflow-x-hidden">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-stone-900/50 z-50">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-100"
          style={{ width: `${Math.min(scrollProgress * 100, 100)}%` }}
        />
      </div>

      {/* Back Button */}
      <Link
        href="/"
        className="fixed top-6 left-6 z-50 bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-full text-sm font-medium hover:bg-black/80 transition-all border border-white/10"
      >
        ← Back
      </Link>

      {/* ==================== HERO ==================== */}
      <section className="h-screen flex items-center justify-center relative overflow-hidden">
        {/* Mosaic of game covers as background */}
        <div
          className="absolute inset-0 grid grid-cols-5 md:grid-cols-8 gap-1 opacity-20"
          style={{ transform: `scale(1.2) translateY(${scrollY * 0.15}px)` }}
        >
          {sortedGames.slice(0, 40).map((game) => (
            <div key={game.id} className="aspect-square overflow-hidden">
              {game.image && (
                <img src={game.image} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />

        <div
          className="relative z-10 text-center px-6"
          style={{
            transform: `translateY(${scrollY * 0.4}px)`,
            opacity: Math.max(0, 1 - scrollY / (windowHeight * 0.6))
          }}
        >
          <p className="text-amber-400 text-sm md:text-base font-semibold tracking-[0.4em] uppercase mb-6">
            Your Collection
          </p>
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight leading-[0.85]">
            <span className="block">{totalGames}</span>
            <span className="block text-4xl sm:text-5xl md:text-6xl text-stone-400 font-light mt-2">games</span>
          </h1>
          <p className="text-stone-500 text-lg mt-8">{stats.totalYears} years of adventures</p>

          <div className="mt-24 animate-bounce">
            <svg className="w-6 h-6 mx-auto text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </section>

      {/* ==================== GAME SHOWCASES ==================== */}
      {showcaseGames.map((game, index) => {
        const galleryImages = (game as any).galleryImages || [];
        const isEven = index % 2 === 0;

        return (
          <section
            key={game.id}
            className="min-h-screen relative flex items-center overflow-hidden"
          >
            {/* Gallery images as atmospheric background layers */}
            <div className="absolute inset-0">
              {/* Primary gallery image - full bleed background */}
              {galleryImages[0] && (
                <div
                  className="absolute inset-0 transition-all duration-700"
                  style={{
                    transform: `scale(1.1) translateY(${(scrollY - (index + 1) * windowHeight) * 0.05}px)`,
                    filter: hoveredGallery === `${game.id}-0` ? 'blur(0px)' : 'blur(2px)'
                  }}
                >
                  <img
                    src={galleryImages[0]}
                    alt=""
                    className={`w-full h-full object-cover transition-opacity duration-500 ${
                      hoveredGallery === `${game.id}-0` ? 'opacity-70' : 'opacity-40'
                    }`}
                  />
                </div>
              )}

              {/* Secondary gallery images - floating panels with hover effects */}
              {galleryImages[1] && (
                <div
                  className={`absolute ${isEven ? 'right-4 md:right-8' : 'left-4 md:left-8'} top-1/4 w-2/5 md:w-1/3 aspect-video hidden lg:block cursor-pointer group transition-all duration-500 ease-out`}
                  style={{
                    transform: hoveredGallery === `${game.id}-1`
                      ? `translateY(${(scrollY - (index + 1) * windowHeight) * 0.02}px) rotate(0deg) scale(1.15)`
                      : `translateY(${(scrollY - (index + 1) * windowHeight) * 0.08}px) rotate(${isEven ? 3 : -3}deg) scale(1)`,
                    zIndex: hoveredGallery === `${game.id}-1` ? 30 : 10,
                  }}
                  onMouseEnter={() => setHoveredGallery(`${game.id}-1`)}
                  onMouseLeave={() => setHoveredGallery(null)}
                >
                  <img
                    src={galleryImages[1]}
                    alt="Game component"
                    className={`w-full h-full object-cover rounded-2xl shadow-2xl transition-all duration-500 ${
                      hoveredGallery === `${game.id}-1`
                        ? 'opacity-100 shadow-amber-500/30'
                        : 'opacity-60'
                    }`}
                  />
                  {/* Hover overlay with subtle info */}
                  <div className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-2xl transition-opacity duration-300 flex items-end p-4 ${
                    hoveredGallery === `${game.id}-1` ? 'opacity-100' : 'opacity-0'
                  }`}>
                    <p className="text-white/80 text-sm font-medium">Game Components</p>
                  </div>
                </div>
              )}

              {galleryImages[2] && (
                <div
                  className={`absolute ${isEven ? 'left-4 md:left-12' : 'right-4 md:right-12'} bottom-20 w-1/3 md:w-1/4 aspect-video hidden xl:block cursor-pointer transition-all duration-500 ease-out`}
                  style={{
                    transform: hoveredGallery === `${game.id}-2`
                      ? `translateY(${(scrollY - (index + 1) * windowHeight) * -0.02}px) rotate(0deg) scale(1.2)`
                      : `translateY(${(scrollY - (index + 1) * windowHeight) * -0.06}px) rotate(${isEven ? -5 : 5}deg) scale(1)`,
                    zIndex: hoveredGallery === `${game.id}-2` ? 30 : 5,
                  }}
                  onMouseEnter={() => setHoveredGallery(`${game.id}-2`)}
                  onMouseLeave={() => setHoveredGallery(null)}
                >
                  <img
                    src={galleryImages[2]}
                    alt="Game detail"
                    className={`w-full h-full object-cover rounded-xl shadow-xl transition-all duration-500 ${
                      hoveredGallery === `${game.id}-2`
                        ? 'opacity-100 shadow-orange-500/30'
                        : 'opacity-50'
                    }`}
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-xl transition-opacity duration-300 flex items-end p-3 ${
                    hoveredGallery === `${game.id}-2` ? 'opacity-100' : 'opacity-0'
                  }`}>
                    <p className="text-white/80 text-xs font-medium">Detail View</p>
                  </div>
                </div>
              )}

              {/* Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/60 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 pointer-events-none" />
            </div>

            {/* Main content */}
            <div className="relative z-20 max-w-7xl mx-auto px-6 py-24 w-full">
              <div className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12 lg:gap-20`}>

                {/* Game Cover - THE HERO */}
                <div className="w-full lg:w-2/5 flex-shrink-0">
                  <div className="relative">
                    {/* Rank badge */}
                    <div className="absolute -top-6 -left-4 z-20 bg-black/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                      <span className="text-amber-400 font-black text-2xl">#{index + 1}</span>
                    </div>

                    {/* Main cover image */}
                    <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 transform hover:scale-[1.02] transition-transform duration-500">
                      {game.image ? (
                        <img
                          src={game.image}
                          alt={game.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-stone-900 flex items-center justify-center">
                          <span className="text-8xl">🎲</span>
                        </div>
                      )}

                      {/* Rating badge on cover */}
                      {game.rating && (
                        <div
                          className="absolute top-4 right-4 px-4 py-2 rounded-full font-black text-lg shadow-lg"
                          style={{ backgroundColor: getRatingColor(game.rating) }}
                        >
                          ★ {game.rating.toFixed(1)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Game Info */}
                <div className={`w-full lg:w-3/5 ${isEven ? 'lg:text-left' : 'lg:text-right'} text-center`}>
                  <p className="text-amber-400 text-sm uppercase tracking-[0.3em] mb-4 font-medium">
                    {game.yearPublished}
                  </p>
                  <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-[0.95]">
                    {game.name}
                  </h2>

                  <div className={`flex items-center gap-4 flex-wrap mb-8 ${isEven ? 'lg:justify-start' : 'lg:justify-end'} justify-center`}>
                    {game.minPlayers && game.maxPlayers && (
                      <div className="px-5 py-2.5 bg-white/10 rounded-full text-sm font-medium backdrop-blur-sm">
                        👥 {game.minPlayers === game.maxPlayers
                          ? `${game.minPlayers} players`
                          : `${game.minPlayers}-${game.maxPlayers} players`
                        }
                      </div>
                    )}
                    {game.minPlaytime && game.maxPlaytime && (
                      <div className="px-5 py-2.5 bg-white/10 rounded-full text-sm font-medium backdrop-blur-sm">
                        ⏱ {game.minPlaytime === game.maxPlaytime
                          ? `${game.minPlaytime} min`
                          : `${game.minPlaytime}-${game.maxPlaytime} min`
                        }
                      </div>
                    )}
                  </div>

                  {/* Context gallery strip - with hover effects */}
                  {galleryImages.length > 0 && (
                    <div className={`flex gap-3 ${isEven ? 'lg:justify-start' : 'lg:justify-end'} justify-center`}>
                      {galleryImages.slice(0, 3).map((img: string, i: number) => (
                        <div
                          key={i}
                          className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border border-white/20 shadow-lg cursor-pointer transition-all duration-300 hover:scale-125 hover:z-10 hover:border-amber-500/50 hover:shadow-amber-500/20"
                          style={{ transform: `rotate(${(i - 1) * 3}deg)` }}
                          onMouseEnter={() => setHoveredGallery(`${game.id}-${i}`)}
                          onMouseLeave={() => setHoveredGallery(null)}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* ==================== STATS INTERLUDE ==================== */}
      <section className="min-h-screen flex items-center justify-center relative py-32 overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-6 gap-2 h-full">
            {sortedGames.slice(12, 36).map((game) => (
              <div key={game.id} className="aspect-square">
                {game.image && <img src={game.image} alt="" className="w-full h-full object-cover" />}
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 bg-black/90" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-20 text-stone-400">
            Your collection in numbers
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-5xl md:text-6xl font-black text-amber-400">{totalGames}</div>
              <div className="text-stone-500 mt-2 text-sm uppercase tracking-wider">Games</div>
            </div>
            <div>
              <div className="text-5xl md:text-6xl font-black text-orange-400">{stats.avgRating.toFixed(1)}</div>
              <div className="text-stone-500 mt-2 text-sm uppercase tracking-wider">Avg Rating</div>
            </div>
            <div>
              <div className="text-5xl md:text-6xl font-black text-rose-400">{stats.totalYears}</div>
              <div className="text-stone-500 mt-2 text-sm uppercase tracking-wider">Years Span</div>
            </div>
            <div>
              <div className="text-5xl md:text-6xl font-black text-pink-400">{stats.oldestGame.yearPublished}</div>
              <div className="text-stone-500 mt-2 text-sm uppercase tracking-wider">Oldest</div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== PICK A GAME ==================== */}
      <section className="min-h-screen flex items-center justify-center py-32 relative overflow-hidden">
        {/* Floating thumbnails background - stable positions with smooth CSS animations */}
        <div className="absolute inset-0">
          {sortedGames.slice(0, 20).map((game, i) => {
            const pos = floatingPositions[i];
            return (
              <div
                key={game.id}
                className="absolute w-20 h-28 md:w-28 md:h-36 rounded-xl overflow-hidden opacity-20 floating-card"
                style={{
                  left: `${pos.left}%`,
                  top: `${pos.top}%`,
                  transform: `rotate(${pos.rotation}deg)`,
                  animationDelay: `${pos.delay}s`,
                }}
              >
                {game.image && <img src={game.image} alt="" className="w-full h-full object-cover" />}
              </div>
            );
          })}
        </div>
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/70 to-black pointer-events-none" />

        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black mb-6">
            What to <span className="text-amber-400">play</span> tonight?
          </h2>
          <p className="text-stone-400 text-lg mb-12">
            Let the dice decide from your {totalGames} games
          </p>

          <button
            onClick={pickRandomGame}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black px-12 py-5 rounded-full text-xl font-black transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/30"
          >
            🎲 Roll the Dice
          </button>

          {/* Suggested game card */}
          {suggestedGame && (
            <div className="mt-16 animate-scale-in">
              <p className="text-stone-600 uppercase tracking-widest text-sm mb-8">Tonight&apos;s pick...</p>

              <div className="bg-gradient-to-br from-stone-900 to-stone-950 rounded-3xl p-8 border border-stone-800 max-w-md mx-auto shadow-2xl">
                {/* Cover as hero */}
                <div className="w-40 h-52 mx-auto rounded-2xl overflow-hidden shadow-2xl border border-white/10 mb-6 transform -rotate-2 hover:rotate-0 transition-transform duration-300">
                  {suggestedGame.image ? (
                    <img
                      src={suggestedGame.image}
                      alt={suggestedGame.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-stone-800 flex items-center justify-center text-5xl">🎲</div>
                  )}
                </div>

                <h3 className="text-2xl md:text-3xl font-black mb-2">{suggestedGame.name}</h3>
                <p className="text-stone-500 mb-4">{suggestedGame.yearPublished}</p>

                <div className="flex items-center justify-center gap-4 flex-wrap">
                  {suggestedGame.rating && (
                    <span
                      className="px-4 py-2 rounded-full font-bold"
                      style={{ backgroundColor: getRatingColor(suggestedGame.rating) }}
                    >
                      ★ {suggestedGame.rating.toFixed(1)}
                    </span>
                  )}
                  {suggestedGame.minPlayers && suggestedGame.maxPlayers && (
                    <span className="text-stone-400 text-sm">
                      {suggestedGame.minPlayers}-{suggestedGame.maxPlayers} players
                    </span>
                  )}
                </div>

                {/* Gallery context */}
                {(suggestedGame as any).galleryImages?.length > 0 && (
                  <div className="flex gap-2 mt-6 justify-center">
                    {(suggestedGame as any).galleryImages.slice(0, 3).map((img: string, i: number) => (
                      <div key={i} className="w-14 h-14 rounded-lg overflow-hidden opacity-70 hover:opacity-100 hover:scale-110 transition-all cursor-pointer">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={pickRandomGame}
                className="mt-8 text-stone-500 hover:text-amber-400 transition-colors text-sm uppercase tracking-widest"
              >
                ↻ Roll again
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ==================== FULL COLLECTION MOSAIC ==================== */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6 mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-stone-400">
            The Complete Collection
          </h2>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-12 gap-1 px-2">
          {sortedGames.map((game) => (
            <div
              key={game.id}
              className="aspect-[3/4] rounded overflow-hidden relative group cursor-pointer"
            >
              {game.image ? (
                <img
                  src={game.image}
                  alt={game.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full bg-stone-900 flex items-center justify-center text-sm">🎲</div>
              )}
              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-1">
                <p className="text-[8px] font-bold text-center leading-tight">{game.name}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <section className="py-32 text-center">
        <p className="text-stone-600 text-sm uppercase tracking-widest mb-4">Thanks for exploring</p>
        <h2 className="text-4xl md:text-6xl font-black mb-8">
          Now go <span className="text-amber-400">play!</span>
        </h2>
        <Link
          href="/"
          className="inline-block bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all border border-white/10"
        >
          Back to Collection →
        </Link>
      </section>

      <style jsx>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(var(--rotation, 0deg)); }
          50% { transform: translateY(-15px) rotate(var(--rotation, 0deg)); }
        }
        .animate-scale-in {
          animation: scale-in 0.4s ease-out forwards;
        }
        .floating-card {
          animation: float 4s ease-in-out infinite;
        }
        .bg-gradient-radial {
          background: radial-gradient(circle at center, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}
