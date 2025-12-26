import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GameListItem } from "./GameListItem";
import type { GameData } from "@/lib/games";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("GameListItem", () => {
  const mockGame: GameData = {
    id: "123",
    name: "Wingspan",
    yearPublished: 2019,
    image: "https://example.com/wingspan.jpg",
    thumbnail: "https://example.com/thumb.jpg",
    selectedThumbnail: null,
    description: "A beautiful bird-themed engine building game about attracting birds.",
    minPlayers: 1,
    maxPlayers: 5,
    minPlaytime: 40,
    maxPlaytime: 70,
    rating: 8.1,
    minAge: 10,
    categories: ["Card Game", "Animals", "Economic"],
    mechanics: ["Hand Management", "Engine Building"],
    isExpansion: false,
    availableImages: [],
    componentImages: [],
  };

  it("should render game name", () => {
    render(<GameListItem game={mockGame} />);

    expect(screen.getByText("Wingspan")).toBeInTheDocument();
  });

  it("should render year published", () => {
    render(<GameListItem game={mockGame} />);

    expect(screen.getByText("2019")).toBeInTheDocument();
  });

  it("should render age restriction", () => {
    render(<GameListItem game={mockGame} />);

    expect(screen.getByText("10+")).toBeInTheDocument();
  });

  it("should render player count range", () => {
    render(<GameListItem game={mockGame} />);

    expect(screen.getByText("👥 1-5P")).toBeInTheDocument();
  });

  it("should render single player count when min equals max", () => {
    const soloGame: GameData = {
      ...mockGame,
      minPlayers: 2,
      maxPlayers: 2,
    };
    render(<GameListItem game={soloGame} />);

    expect(screen.getByText("👥 2P")).toBeInTheDocument();
  });

  it("should render playtime range", () => {
    render(<GameListItem game={mockGame} />);

    expect(screen.getByText("⏱ 40-70m")).toBeInTheDocument();
  });

  it("should render single playtime when min equals max", () => {
    const fixedTimeGame: GameData = {
      ...mockGame,
      minPlaytime: 60,
      maxPlaytime: 60,
    };
    render(<GameListItem game={fixedTimeGame} />);

    expect(screen.getByText("⏱ 60m")).toBeInTheDocument();
  });

  it("should render rating with star", () => {
    render(<GameListItem game={mockGame} />);

    expect(screen.getByText("★ 8.1")).toBeInTheDocument();
  });

  it("should render description", () => {
    render(<GameListItem game={mockGame} />);

    expect(screen.getByText(/A beautiful bird-themed/)).toBeInTheDocument();
  });

  it("should render categories (up to 3)", () => {
    render(<GameListItem game={mockGame} />);

    expect(screen.getByText("Card Game")).toBeInTheDocument();
    expect(screen.getByText("Animals")).toBeInTheDocument();
    expect(screen.getByText("Economic")).toBeInTheDocument();
  });

  it("should link to game detail page", () => {
    render(<GameListItem game={mockGame} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/game/123");
  });

  it("should render game image", () => {
    render(<GameListItem game={mockGame} />);

    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("src", "https://example.com/wingspan.jpg");
  });

  it("should prefer selectedThumbnail over image", () => {
    const gameWithSelected: GameData = {
      ...mockGame,
      selectedThumbnail: "https://example.com/selected.jpg",
    };
    render(<GameListItem game={gameWithSelected} />);

    const image = screen.getByRole("img");
    expect(image).toHaveAttribute("src", "https://example.com/selected.jpg");
  });

  it("should render expansion badge when isExpansion is true", () => {
    const expansion: GameData = {
      ...mockGame,
      isExpansion: true,
    };
    render(<GameListItem game={expansion} />);

    expect(screen.getByText("EXP")).toBeInTheDocument();
  });

  it("should not render expansion badge for base games", () => {
    render(<GameListItem game={mockGame} />);

    expect(screen.queryByText("EXP")).not.toBeInTheDocument();
  });

  it("should render fallback emoji when no image", () => {
    const gameWithoutImage: GameData = {
      ...mockGame,
      image: null,
      thumbnail: null,
      selectedThumbnail: null,
    };
    render(<GameListItem game={gameWithoutImage} />);

    expect(screen.getByText("🎲")).toBeInTheDocument();
  });

  it("should not render description when null", () => {
    const gameWithoutDesc: GameData = {
      ...mockGame,
      description: null,
    };
    render(<GameListItem game={gameWithoutDesc} />);

    expect(screen.queryByText(/A beautiful bird-themed/)).not.toBeInTheDocument();
  });

  it("should not render categories section when empty", () => {
    const gameWithoutCategories: GameData = {
      ...mockGame,
      categories: [],
    };
    render(<GameListItem game={gameWithoutCategories} />);

    expect(screen.queryByText("Card Game")).not.toBeInTheDocument();
  });
});
