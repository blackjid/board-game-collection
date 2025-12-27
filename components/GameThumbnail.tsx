"use client";

import Image from "next/image";

interface GameThumbnailProps {
  /** Image URL to display */
  src: string | null;
  /** Alt text for the image */
  alt: string;
  /** Size preset or custom dimensions */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** Custom width (only used when size is not specified) */
  width?: number;
  /** Custom height (only used when size is not specified) */
  height?: number;
  /** Custom class name for the container */
  className?: string;
  /** Whether the image should scale on hover (for interactive cards) */
  hoverScale?: boolean;
  /** Fallback icon when no image is available */
  fallbackIcon?: React.ReactNode;
  /** Optional aspect ratio override (default is 1:1 for square) */
  aspectRatio?: "square" | "4/3" | "3/4" | "16/9";
}

// Default fallback icon (dice)
const DiceIcon = (
  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    <circle cx="16" cy="8" r="1.5" fill="currentColor" />
    <circle cx="8" cy="16" r="1.5" fill="currentColor" />
    <circle cx="16" cy="16" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

const StarIcon = (
  <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

// Predefined sizes
const SIZE_MAP = {
  sm: { width: 48, height: 48, sizes: "48px" },
  md: { width: 64, height: 64, sizes: "64px" },
  lg: { width: 96, height: 96, sizes: "96px" },
  xl: { width: 128, height: 128, sizes: "128px" },
  full: { width: undefined, height: undefined, sizes: "(max-width: 640px) 100vw, 500px" },
};

const ASPECT_RATIO_MAP = {
  square: "aspect-square",
  "4/3": "aspect-[4/3]",
  "3/4": "aspect-[3/4]",
  "16/9": "aspect-video",
};

/**
 * GameThumbnail - A reusable component for displaying game images with a blurred background.
 *
 * This component shows the image at its natural aspect ratio (object-contain) without cropping,
 * while filling the background with a blurred, saturated version of the same image for visual appeal.
 *
 * @example
 * // Basic usage with size preset
 * <GameThumbnail src={game.image} alt={game.name} size="lg" />
 *
 * @example
 * // Full width with 4:3 aspect ratio
 * <GameThumbnail src={game.image} alt={game.name} size="full" aspectRatio="4/3" />
 *
 * @example
 * // Custom fallback icon
 * <GameThumbnail src={game.image} alt={game.name} size="md" fallbackIcon={<StarIcon />} />
 */
export function GameThumbnail({
  src,
  alt,
  size = "md",
  width,
  height,
  className = "",
  hoverScale = false,
  fallbackIcon,
  aspectRatio = "square",
}: GameThumbnailProps) {
  const sizeConfig = SIZE_MAP[size];
  const aspectClass = ASPECT_RATIO_MAP[aspectRatio];

  // For fixed sizes, use explicit dimensions; for "full", use aspect ratio
  const containerStyle = size !== "full"
    ? { width: width || sizeConfig.width, height: height || sizeConfig.height }
    : undefined;

  const imageSizes = sizeConfig.sizes;

  return (
    <div
      className={`relative overflow-hidden bg-stone-800 rounded-lg ${size === "full" ? aspectClass : ""} ${className}`}
      style={containerStyle}
    >
      {src ? (
        <>
          {/* Blurred background layer - scaled up to ensure full coverage */}
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={src}
              alt=""
              aria-hidden="true"
              fill
              sizes={imageSizes}
              className="object-cover blur-3xl saturate-150 opacity-80 scale-[3]"
            />
          </div>

          {/* Subtle vignette overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />

          {/* Main image - shown at natural aspect ratio, never cropped */}
          <Image
            src={src}
            alt={alt}
            fill
            sizes={imageSizes}
            className={`object-contain z-10 drop-shadow-lg ${hoverScale ? "group-hover:scale-105 transition-transform duration-300" : ""}`}
          />
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-stone-500 bg-gradient-to-br from-stone-800 to-stone-900">
          <span className="w-1/3 h-1/3 max-w-8 max-h-8">
            {fallbackIcon || DiceIcon}
          </span>
        </div>
      )}
    </div>
  );
}

// Export icons for use as fallbacks
export const GameThumbnailIcons = {
  dice: DiceIcon,
  star: StarIcon,
};
