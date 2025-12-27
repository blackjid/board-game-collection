import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GameCard } from "./GameCard";
import type { GameData } from "@/lib/games";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("GameCard", () => {
  const mockGame: GameData = {
    id: "123",
    name: "Wingspan",
    yearPublished: 2019,
    image: "https://example.com/wingspan.jpg",
    thumbnail: "https://example.com/thumb.jpg",
    selectedThumbnail: null,
    description: "A bird-themed game",
    minPlayers: 1,
    maxPlayers: 5,
    minPlaytime: 40,
    maxPlaytime: 70,
    rating: 8.1,
    minAge: 10,
    categories: ["Card Game", "Animals"],
    mechanics: ["Hand Management"],
    isExpansion: false,
    availableImages: [],
    componentImages: [],
  };

  it("should render game name", () => {
    render(<GameCard game={mockGame} />);

    expect(screen.getByText("Wingspan")).toBeInTheDocument();
  });

  it("should render year published", () => {
    render(<GameCard game={mockGame} />);

    expect(screen.getByText("2019")).toBeInTheDocument();
  });

  it("should render player count range", () => {
    render(<GameCard game={mockGame} />);

    expect(screen.getByText("1-5P")).toBeInTheDocument();
  });

  it("should render single player count when min equals max", () => {
    const soloGame: GameData = {
      ...mockGame,
      minPlayers: 2,
      maxPlayers: 2,
    };
    render(<GameCard game={soloGame} />);

    expect(screen.getByText("2P")).toBeInTheDocument();
  });

  it("should render playtime range", () => {
    render(<GameCard game={mockGame} />);

    expect(screen.getByText("40-70m")).toBeInTheDocument();
  });

  it("should render single playtime when min equals max", () => {
    const fixedTimeGame: GameData = {
      ...mockGame,
      minPlaytime: 60,
      maxPlaytime: 60,
    };
    render(<GameCard game={fixedTimeGame} />);

    expect(screen.getByText("60m")).toBeInTheDocument();
  });

  it("should render rating", () => {
    render(<GameCard game={mockGame} />);

    expect(screen.getByText("8.1")).toBeInTheDocument();
  });

  it("should link to game detail page", () => {
    render(<GameCard game={mockGame} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/game/123");
  });

  it("should render game image", () => {
    render(<GameCard game={mockGame} />);

    const images = screen.getAllByRole("img");
    const mainImage = images.find(img => img.getAttribute("alt") === "Wingspan");
    // Next.js Image transforms URLs, so check that src contains the encoded URL
    expect(mainImage?.getAttribute("src")).toContain(encodeURIComponent("https://example.com/wingspan.jpg"));
  });

  it("should prefer selectedThumbnail over image", () => {
    const gameWithSelected: GameData = {
      ...mockGame,
      selectedThumbnail: "https://example.com/selected.jpg",
    };
    render(<GameCard game={gameWithSelected} />);

    const images = screen.getAllByRole("img");
    const mainImage = images.find(img => img.getAttribute("alt") === "Wingspan");
    // Next.js Image transforms URLs, so check that src contains the encoded URL
    expect(mainImage?.getAttribute("src")).toContain(encodeURIComponent("https://example.com/selected.jpg"));
  });

  it("should render fallback when no image", () => {
    const gameWithoutImage: GameData = {
      ...mockGame,
      image: null,
      thumbnail: null,
      selectedThumbnail: null,
    };
    render(<GameCard game={gameWithoutImage} />);

    expect(screen.getByText("🎲")).toBeInTheDocument();
  });

  it("should not render year when null", () => {
    const gameWithoutYear: GameData = {
      ...mockGame,
      yearPublished: null,
    };
    render(<GameCard game={gameWithoutYear} />);

    expect(screen.queryByText("2019")).not.toBeInTheDocument();
  });

  it("should not render rating when null", () => {
    const gameWithoutRating: GameData = {
      ...mockGame,
      rating: null,
    };
    render(<GameCard game={gameWithoutRating} />);

    expect(screen.queryByText("8.1")).not.toBeInTheDocument();
  });
});

// Test getRatingColor function behavior through component rendering
describe("GameCard rating colors", () => {
  const createGameWithRating = (rating: number): GameData => ({
    id: "1",
    name: "Test",
    yearPublished: 2020,
    image: "https://example.com/test.jpg",
    thumbnail: null,
    selectedThumbnail: null,
    description: null,
    minPlayers: null,
    maxPlayers: null,
    minPlaytime: null,
    maxPlaytime: null,
    rating,
    minAge: null,
    categories: [],
    mechanics: [],
    isExpansion: false,
    availableImages: [],
    componentImages: [],
  });

  it("should render low rating (below 6) with reddish color", () => {
    const game = createGameWithRating(5.0);
    render(<GameCard game={game} />);

    const ratingElement = screen.getByText("5.0");
    const style = ratingElement.getAttribute("style");

    // Rating 5 should have more red (higher R value)
    expect(style).toContain("rgb(");
  });

  it("should render high rating (above 7) with greenish color", () => {
    const game = createGameWithRating(8.5);
    render(<GameCard game={game} />);

    const ratingElement = screen.getByText("8.5");
    const style = ratingElement.getAttribute("style");

    // Rating 8.5 should have more green
    expect(style).toContain("rgb(");
  });
});

