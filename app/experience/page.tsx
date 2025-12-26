"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
  const { games, totalGames } = gamesData;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [windowHeight, setWindowHeight] = useState(1);
  const [docHeight, setDocHeight] = useState(1);
  const [suggestedGame, setSuggestedGame] = useState<typeof games[0] | null>(null);
  const [hoveredGallery, setHoveredGallery] = useState<string | null>(null);
  const [collectionName, setCollectionName] = useState<string | null>(null);

  // Fetch collection settings
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setCollectionName(data.collectionName || (data.bggUsername ? `${data.bggUsername}'s` : "My"));
      })
      .catch(() => {});
  }, []);

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

    // Calculate total playtime potential (sum of avg playtime for each game)
    const totalMinutes = games.reduce((acc, g) => {
      const avgTime = g.minPlaytime && g.maxPlaytime ? (g.minPlaytime + g.maxPlaytime) / 2 : (g.minPlaytime || g.maxPlaytime || 60);
      return acc + avgTime;
    }, 0);
    const totalHours = Math.round(totalMinutes / 60);

    return { avgRating, oldestGame, newestGame, totalHours };
  }, [games]);

  // Pick a random game
  const pickRandomGame = () => {
    const randomIndex = Math.floor(Math.random() * games.length);
    setSuggestedGame(games[randomIndex]);
  };

  useEffect(() => {
    const updateDimensions = () => {
      setWindowHeight(window.innerHeight);
      if (containerRef.current) {
        setDocHeight(containerRef.current.scrollHeight);
      }
    };

    updateDimensions();

    const handleScroll = () => {
      if (containerRef.current) {
        setScrollY(containerRef.current.scrollTop);
        setDocHeight(containerRef.current.scrollHeight);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
    }
    window.addEventListener("resize", updateDimensions);

    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  // Calculate current section index for the "Story" progress bar
  const totalSections = showcaseGames.length + 3; // Hero + Showcase + Stats + Dice + Collection
  const currentSection = Math.min(
    totalSections - 1,
    Math.max(0, Math.floor((scrollY + windowHeight / 2) / windowHeight))
  );

  return (
    <div
      ref={containerRef}
      className="bg-black text-white h-screen w-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
    >
      {/* Story Progress Bars - hidden on mobile, simplified on tablet */}
      <div className="fixed top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 z-50 hidden sm:flex gap-1 sm:gap-2">
        {Array.from({ length: totalSections }).map((_, i) => (
          <div key={i} className="h-0.5 sm:h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className={`h-full bg-white transition-all duration-300 ${
                i < currentSection ? 'w-full' : i === currentSection ? 'w-full opacity-100' : 'w-0'
              }`}
              style={{
                 width: i < currentSection ? '100%' : i === currentSection ? `${Math.min(100, ((scrollY - i * windowHeight) / windowHeight) * 100 + 100)}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Mobile progress indicator - simple dot-based */}
      <div className="fixed top-3 right-3 z-50 sm:hidden flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full">
        <span className="text-white text-xs font-medium">{currentSection + 1}</span>
        <span className="text-white/40 text-xs">/</span>
        <span className="text-white/60 text-xs">{totalSections}</span>
      </div>

      {/* Back Button */}
      <Link
        href="/"
        className="fixed top-3 left-3 sm:top-8 sm:left-6 z-50 bg-black/40 backdrop-blur-md px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium hover:bg-white/10 transition-all border border-white/10 group"
      >
        <span className="group-hover:-translate-x-1 inline-block transition-transform">←</span> <span className="hidden sm:inline">Back</span>
      </Link>

      {/* ==================== HERO (Slide 1) ==================== */}
      <section className="h-screen w-full snap-start flex items-center justify-center relative overflow-hidden">
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

          <div className="relative z-10 text-center px-4 sm:px-6">
            <p className="text-amber-400 text-xs sm:text-sm md:text-base font-semibold tracking-[0.2em] sm:tracking-[0.4em] uppercase mb-4 sm:mb-6 animate-fade-in-up">
              {collectionName ? `${collectionName} Collection` : "The Collection"}
            </p>
            <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tight leading-[0.85] mb-6 sm:mb-8 animate-fade-in-up delay-100">
              <span className="block">{totalGames}</span>
              <span className="block text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-stone-400 font-light mt-1 sm:mt-2">worlds to explore</span>
            </h1>

            <div className="mt-8 sm:mt-12 opacity-0 animate-fade-in-up delay-300">
              <p className="text-stone-500 text-base sm:text-lg italic">
                &quot;Every box holds a new universe.&quot;
              </p>
            </div>

            <div className="mt-16 sm:mt-24 animate-bounce">
              <svg className="w-5 sm:w-6 h-5 sm:h-6 mx-auto text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
      </section>

      {/* ==================== GAME SHOWCASES ==================== */}
      {showcaseGames.map((game, index) => {
        const galleryImages = (game as any).galleryImages || [];
        const isEven = index % 2 === 0;

        // Calculate section-specific scroll progress (0 = entering, 1 = leaving)
        const sectionStart = (index + 1) * windowHeight;
        const sectionProgress = Math.max(0, Math.min(1, (scrollY - sectionStart + windowHeight) / windowHeight));

        // Reveal progress (0 = hidden, 1 = fully visible) - triggers when section is ~30% visible
        const revealProgress = Math.max(0, Math.min(1, (sectionProgress - 0.2) * 2.5));

        // Easing function for smoother animations
        const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
        const easedReveal = easeOut(revealProgress);

        return (
          <section
            key={game.id}
            className="h-screen w-full snap-start relative flex items-center overflow-hidden"
          >
            {/* Gallery images as atmospheric background layers */}
            <div className="absolute inset-0">
              {/* Primary gallery image - full bleed background with parallax */}
              {galleryImages[0] && (
                <div
                  className="absolute inset-0 transition-[filter] duration-700"
                  style={{
                    transform: `scale(1.2) translateY(${(scrollY - sectionStart) * 0.1}px)`,
                    filter: hoveredGallery === `${game.id}-0` ? 'blur(0px)' : 'blur(3px)',
                    opacity: 0.3 + easedReveal * 0.3,
                  }}
                >
                  <img
                    src={galleryImages[0]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Floating preview panel - only appears when hovering thumbnails */}
              {galleryImages.length > 0 && (() => {
                const hoveredIndex = hoveredGallery?.startsWith(`${game.id}-`)
                  ? parseInt(hoveredGallery.split('-')[1])
                  : null;
                const isHovered = hoveredIndex !== null;
                const displayImage = isHovered && galleryImages[hoveredIndex]
                  ? galleryImages[hoveredIndex]
                  : null;

                return (
                  <div
                    className={`absolute ${isEven ? 'right-4 md:right-12' : 'left-4 md:left-12'} top-1/4 w-2/5 md:w-1/3 aspect-video hidden lg:block pointer-events-none transition-all duration-500 ease-out`}
                    style={{
                      transform: isHovered
                        ? `translateY(${(scrollY - sectionStart) * 0.05}px) rotate(${isEven ? 3 : -3}deg) scale(1)`
                        : `translateY(${(scrollY - sectionStart) * 0.05}px) rotate(${isEven ? 6 : -6}deg) scale(0.9)`,
                      opacity: isHovered ? 1 : 0,
                      zIndex: 30,
                    }}
                  >
                    {displayImage && (
                      <img
                        src={displayImage}
                        alt="Game component preview"
                        className="w-full h-full object-cover rounded-2xl shadow-2xl shadow-amber-500/30 border border-amber-500/20"
                      />
                    )}
                  </div>
                );
              })()}

              {/* Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/60 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 pointer-events-none" />
            </div>

            {/* Main content with staggered reveal animations */}
            <div className="relative z-20 max-w-7xl mx-auto px-6 py-24 w-full">
              <div className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12 lg:gap-20`}>

                {/* Game Cover - slides in from the side with parallax */}
                <div
                  className="w-full lg:w-2/5 flex-shrink-0 transition-[transform,opacity] duration-700 ease-out"
                  style={{
                    transform: `translateX(${(1 - easedReveal) * (isEven ? -100 : 100)}px) translateY(${(scrollY - sectionStart) * 0.03}px)`,
                    opacity: easedReveal,
                  }}
                >
                  <div className="relative">
                    {/* Rank badge - pops in with scale */}
                    <div
                      className="absolute -top-6 -left-4 z-20 bg-black/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 transition-all duration-500"
                      style={{
                        transform: `scale(${0.5 + easedReveal * 0.5}) rotate(${(1 - easedReveal) * -20}deg)`,
                        opacity: easedReveal,
                      }}
                    >
                      <span className="text-amber-400 font-black text-2xl">#{index + 1}</span>
                    </div>

                    {/* Main cover image */}
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 transform hover:scale-[1.02] transition-transform duration-500">
                      {game.image ? (
                        <img
                          src={game.image}
                          alt={game.name}
                          className="w-full h-auto max-h-[70vh] object-contain"
                        />
                      ) : (
                        <div className="w-full aspect-[3/4] bg-stone-900 flex items-center justify-center">
                          <span className="text-8xl">🎲</span>
                        </div>
                      )}

                      {/* Rating badge - arrives with delay */}
                      {game.rating && (
                        <div
                          className="absolute top-4 right-4 px-4 py-2 rounded-full font-black text-lg shadow-lg transition-all duration-500"
                          style={{
                            backgroundColor: getRatingColor(game.rating),
                            transform: `translateY(${(1 - easedReveal) * -30}px) scale(${0.8 + easedReveal * 0.2})`,
                            opacity: easedReveal,
                          }}
                        >
                          ★ {game.rating.toFixed(1)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Game Info - staggered text reveals */}
                <div className={`w-full lg:w-3/5 ${isEven ? 'lg:text-left' : 'lg:text-right'} text-center`}>
                  {/* Year and type badge - first to appear */}
                  <div
                    className={`flex items-center gap-3 mb-4 ${isEven ? 'lg:justify-start' : 'lg:justify-end'} justify-center`}
                    style={{
                      transform: `translateY(${(1 - easedReveal) * 30}px)`,
                      opacity: easedReveal,
                    }}
                  >
                    <p className="text-amber-400 text-sm uppercase tracking-[0.3em] font-medium">
                      {game.yearPublished}
                    </p>
                    {(game as any).isExpansion && (
                      <span className="bg-purple-600/80 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                        Expansion
                      </span>
                    )}
                  </div>

                  {/* Title - slides up with slight delay */}
                  <h2
                    className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-4 leading-[0.95] transition-all duration-700"
                    style={{
                      transform: `translateY(${(1 - easedReveal) * 50}px)`,
                      opacity: easedReveal,
                    }}
                  >
                    {game.name}
                  </h2>

                  {/* Description */}
                  {(game as any).description && (
                    <p
                      className="text-stone-400 text-sm md:text-base mb-6 line-clamp-2 max-w-xl mx-auto lg:mx-0"
                      style={{
                        transform: `translateY(${(1 - easedReveal) * 40}px)`,
                        opacity: easedReveal * 0.9,
                      }}
                    >
                      {(game as any).description}
                    </p>
                  )}

                  {/* Player/time/age badges - arrive with stagger */}
                  <div
                    className={`flex items-center gap-3 flex-wrap mb-4 ${isEven ? 'lg:justify-start' : 'lg:justify-end'} justify-center`}
                    style={{
                      transform: `translateY(${(1 - easeOut(Math.max(0, (sectionProgress - 0.3) * 2))) * 40}px)`,
                      opacity: easeOut(Math.max(0, (sectionProgress - 0.3) * 2)),
                    }}
                  >
                    {game.minPlayers && game.maxPlayers && (
                      <div className="px-4 py-2 bg-white/10 rounded-full text-sm font-medium backdrop-blur-sm border border-white/5">
                        👥 {game.minPlayers === game.maxPlayers
                          ? `${game.minPlayers} players`
                          : `${game.minPlayers}-${game.maxPlayers} players`
                        }
                      </div>
                    )}
                    {(game as any).bestPlayerCount && (game as any).bestPlayerCount.length > 0 && (
                      <div className="px-4 py-2 bg-amber-500/20 rounded-full text-sm font-medium backdrop-blur-sm border border-amber-500/30 text-amber-300">
                        ⭐ Best: {(game as any).bestPlayerCount.length === 1
                          ? `${(game as any).bestPlayerCount[0]}P`
                          : `${(game as any).bestPlayerCount[0]}-${(game as any).bestPlayerCount[(game as any).bestPlayerCount.length - 1]}P`
                        }
                      </div>
                    )}
                    {game.minPlaytime && game.maxPlaytime && (
                      <div className="px-4 py-2 bg-white/10 rounded-full text-sm font-medium backdrop-blur-sm border border-white/5">
                        ⏱ {game.minPlaytime === game.maxPlaytime
                          ? `${game.minPlaytime} min`
                          : `${game.minPlaytime}-${game.maxPlaytime} min`
                        }
                      </div>
                    )}
                    {((game as any).communityAge || (game as any).minAge) && (
                      <div className="px-4 py-2 bg-white/10 rounded-full text-sm font-medium backdrop-blur-sm border border-white/5">
                        {(game as any).communityAge ?? (game as any).minAge}+
                      </div>
                    )}
                  </div>

                  {/* Categories & mechanics */}
                  {((game as any).categories?.length > 0 || (game as any).mechanics?.length > 0) && (
                    <div
                      className={`flex items-center gap-2 flex-wrap mb-6 ${isEven ? 'lg:justify-start' : 'lg:justify-end'} justify-center`}
                      style={{
                        transform: `translateY(${(1 - easeOut(Math.max(0, (sectionProgress - 0.32) * 2))) * 35}px)`,
                        opacity: easeOut(Math.max(0, (sectionProgress - 0.32) * 2)),
                      }}
                    >
                      {(game as any).categories?.slice(0, 2).map((cat: string, i: number) => (
                        <span key={`cat-${i}`} className="text-xs bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full border border-blue-500/30">
                          {cat}
                        </span>
                      ))}
                      {(game as any).mechanics?.slice(0, 2).map((mech: string, i: number) => (
                        <span key={`mech-${i}`} className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                          {mech}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Users rated */}
                  {(game as any).usersRated && (
                    <p
                      className={`text-stone-500 text-xs mb-6 ${isEven ? 'lg:text-left' : 'lg:text-right'}`}
                      style={{
                        opacity: easeOut(Math.max(0, (sectionProgress - 0.35) * 2)),
                      }}
                    >
                      {(game as any).usersRated.toLocaleString()} community ratings
                    </p>
                  )}

                  {/* Gallery thumbnails - arrive last with individual stagger */}
                  {galleryImages.length > 0 && (
                    <div className={`flex gap-3 ${isEven ? 'lg:justify-start' : 'lg:justify-end'} justify-center items-center`}>
                      {galleryImages.slice(0, 3).map((img: string, i: number) => {
                        // Clamp the input to min(1) to stop animation overshooting
                        const rawProgress = (sectionProgress - 0.35 - i * 0.05) * 3;
                        const thumbReveal = easeOut(Math.max(0, Math.min(1, rawProgress)));

                        return (
                          <div
                            key={i}
                            className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border border-white/20 shadow-lg cursor-pointer transition-all duration-300 hover:scale-125 hover:z-10 hover:border-amber-500/50 hover:shadow-amber-500/30"
                            style={{
                              transform: `translateY(${(1 - thumbReveal) * 40}px) scale(${0.8 + thumbReveal * 0.2})`,
                              opacity: thumbReveal,
                            }}
                            onMouseEnter={() => setHoveredGallery(`${game.id}-${i}`)}
                            onMouseLeave={() => setHoveredGallery(null)}
                          >
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* ==================== STATS INTERLUDE ==================== */}
      <section className="h-screen w-full snap-start flex items-center justify-center relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 sm:gap-2 h-full">
            {sortedGames.slice(12, 36).map((game) => (
              <div key={game.id} className="aspect-square">
                {game.image && <img src={game.image} alt="" className="w-full h-full object-cover" />}
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 bg-black/90" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black mb-10 sm:mb-20 text-stone-400">
            Your collection in numbers
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
            <div>
              <div className="text-4xl sm:text-5xl md:text-6xl font-black text-amber-400">{totalGames}</div>
              <div className="text-stone-500 mt-1 sm:mt-2 text-xs sm:text-sm uppercase tracking-wider">Games</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl md:text-6xl font-black text-orange-400">{stats.avgRating.toFixed(1)}</div>
              <div className="text-stone-500 mt-1 sm:mt-2 text-xs sm:text-sm uppercase tracking-wider">Avg Rating</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl md:text-6xl font-black text-rose-400">{stats.totalHours}</div>
              <div className="text-stone-500 mt-1 sm:mt-2 text-xs sm:text-sm uppercase tracking-wider">Hours of Fun</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl md:text-6xl font-black text-pink-400">{stats.oldestGame.yearPublished}</div>
              <div className="text-stone-500 mt-1 sm:mt-2 text-xs sm:text-sm uppercase tracking-wider">Oldest</div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== PICK A GAME ==================== */}
      <section className="h-screen w-full snap-start flex items-center justify-center relative overflow-hidden">
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

        <div className="relative z-10 text-center px-4 sm:px-6 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-black mb-4 sm:mb-6">
            What to <span className="text-amber-400">play</span> tonight?
          </h2>
          <p className="text-stone-400 text-sm sm:text-lg mb-8 sm:mb-12">
            Let the dice decide from your {totalGames} games
          </p>

          <button
            onClick={pickRandomGame}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black px-8 sm:px-12 py-4 sm:py-5 rounded-full text-lg sm:text-xl font-black transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/30"
          >
            🎲 Roll the Dice
          </button>

          {/* Suggested game card */}
          {suggestedGame && (
            <div className="mt-10 sm:mt-16 animate-scale-in">
              <p className="text-stone-600 uppercase tracking-widest text-xs sm:text-sm mb-4 sm:mb-8">Tonight&apos;s pick...</p>

              <div className="bg-gradient-to-br from-stone-900 to-stone-950 rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-stone-800 max-w-lg mx-auto shadow-2xl">
                {/* Cover as hero */}
                <div className="w-28 h-36 sm:w-40 sm:h-52 mx-auto rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-white/10 mb-4 sm:mb-6 transform -rotate-2 hover:rotate-0 transition-transform duration-300 relative">
                  {suggestedGame.image ? (
                    <img
                      src={suggestedGame.image}
                      alt={suggestedGame.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-stone-800 flex items-center justify-center text-4xl sm:text-5xl">🎲</div>
                  )}
                  {(suggestedGame as any).isExpansion && (
                    <div className="absolute top-2 left-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      EXP
                    </div>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl md:text-3xl font-black mb-1 sm:mb-2">{suggestedGame.name}</h3>
                <p className="text-stone-500 text-sm sm:text-base mb-3 sm:mb-4">{suggestedGame.yearPublished}</p>

                {/* Description */}
                {(suggestedGame as any).description && (
                  <p className="text-stone-400 text-sm mb-4 line-clamp-2">
                    {(suggestedGame as any).description}
                  </p>
                )}

                <div className="flex items-center justify-center gap-3 flex-wrap mb-4">
                  {suggestedGame.rating && (
                    <span
                      className="px-4 py-2 rounded-full font-bold"
                      style={{ backgroundColor: getRatingColor(suggestedGame.rating) }}
                    >
                      ★ {suggestedGame.rating.toFixed(1)}
                    </span>
                  )}
                  {suggestedGame.minPlayers && suggestedGame.maxPlayers && (
                    <span className="text-stone-300 text-sm bg-white/10 px-3 py-1.5 rounded-full">
                      👥 {suggestedGame.minPlayers}-{suggestedGame.maxPlayers}P
                    </span>
                  )}
                  {(suggestedGame as any).bestPlayerCount && (suggestedGame as any).bestPlayerCount.length > 0 && (
                    <span className="text-amber-300 text-sm bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-500/30">
                      ⭐ Best: {(suggestedGame as any).bestPlayerCount.length === 1
                        ? `${(suggestedGame as any).bestPlayerCount[0]}P`
                        : `${(suggestedGame as any).bestPlayerCount[0]}-${(suggestedGame as any).bestPlayerCount[(suggestedGame as any).bestPlayerCount.length - 1]}P`
                      }
                    </span>
                  )}
                  {suggestedGame.minPlaytime && suggestedGame.maxPlaytime && (
                    <span className="text-stone-300 text-sm bg-white/10 px-3 py-1.5 rounded-full">
                      ⏱ {suggestedGame.minPlaytime}-{suggestedGame.maxPlaytime}m
                    </span>
                  )}
                  {((suggestedGame as any).communityAge || (suggestedGame as any).minAge) && (
                    <span className="text-stone-300 text-sm bg-white/10 px-3 py-1.5 rounded-full">
                      {(suggestedGame as any).communityAge ?? (suggestedGame as any).minAge}+
                    </span>
                  )}
                </div>

                {/* Categories */}
                {(suggestedGame as any).categories?.length > 0 && (
                  <div className="flex gap-2 justify-center flex-wrap mb-4">
                    {(suggestedGame as any).categories.slice(0, 3).map((cat: string, i: number) => (
                      <span key={i} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
                        {cat}
                      </span>
                    ))}
                  </div>
                )}

                {/* Gallery context */}
                {(suggestedGame as any).galleryImages?.length > 0 && (
                  <div className="flex gap-2 mt-4 justify-center">
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
      <section className="h-screen w-full snap-start overflow-y-auto relative py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-6 sm:mb-12 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-stone-400">
            The Complete Collection
          </h2>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-12 gap-1 px-1 sm:px-2">
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
                <div className="w-full h-full bg-stone-900 flex items-center justify-center text-xs sm:text-sm">🎲</div>
              )}
              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center p-0.5 sm:p-1">
                <p className="text-[6px] sm:text-[8px] font-bold text-center leading-tight">{game.name}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ==================== FOOTER ==================== */}
        <div className="py-12 sm:py-24 text-center px-4">
          <p className="text-stone-600 text-xs sm:text-sm uppercase tracking-widest mb-2 sm:mb-4">Thanks for exploring</p>
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-black mb-6 sm:mb-8">
            Now go <span className="text-amber-400">play!</span>
          </h2>
          <Link
            href="/"
            className="inline-block bg-white/10 hover:bg-white/20 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-semibold transition-all border border-white/10"
          >
            Back to Collection →
          </Link>
        </div>
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
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .delay-100 { animation-delay: 100ms; }
        .delay-300 { animation-delay: 300ms; }
      `}</style>
    </div>
  );
}
