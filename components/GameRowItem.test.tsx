import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GameRowItem } from "./GameRowItem";
import type { GameData } from "@/lib/games";

// Mock Next.js components
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <img alt={alt} src={src} data-testid="game-image" />
  ),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="game-link">
      {children}
    </a>
  ),
}));

// Create mock game data
const createMockGame = (overrides: Partial<GameData> = {}): GameData => ({
  id: "1",
  name: "Test Game",
  yearPublished: 2020,
  image: "https://example.com/image.jpg",
  thumbnail: "https://example.com/thumb.jpg",
  selectedThumbnail: null,
  description: "A test game",
  minPlayers: 2,
  maxPlayers: 4,
  minPlaytime: 30,
  maxPlaytime: 60,
  rating: 7.5,
  minAge: 10,
  categories: ["Strategy"],
  mechanics: ["Dice Rolling"],
  isExpansion: false,
  availableImages: [],
  componentImages: [],
  lastScraped: "2024-01-01T00:00:00Z",
  collections: [{ id: "col-1", name: "Primary", type: "bgg_sync" }],
  ...overrides,
});

describe("GameRowItem", () => {
  describe("rendering", () => {
    it("should render game name", () => {
      render(<GameRowItem game={createMockGame({ name: "Wingspan" })} />);
      expect(screen.getByText("Wingspan")).toBeInTheDocument();
    });

    it("should render year published", () => {
      render(<GameRowItem game={createMockGame({ yearPublished: 2019 })} />);
      expect(screen.getByText("2019")).toBeInTheDocument();
    });

    it("should render rating badge", () => {
      render(<GameRowItem game={createMockGame({ rating: 8.5 })} />);
      expect(screen.getByText("★ 8.5")).toBeInTheDocument();
    });

    it("should not render rating when null", () => {
      render(<GameRowItem game={createMockGame({ rating: null })} />);
      expect(screen.queryByText(/★/)).not.toBeInTheDocument();
    });

    it("should render Exp badge for expansions", () => {
      render(<GameRowItem game={createMockGame({ isExpansion: true })} />);
      expect(screen.getByText("Exp")).toBeInTheDocument();
    });

    it("should render game image", () => {
      render(<GameRowItem game={createMockGame({ thumbnail: "test.jpg" })} />);
      expect(screen.getByTestId("game-image")).toBeInTheDocument();
    });

    it("should prefer selectedThumbnail over thumbnail", () => {
      render(
        <GameRowItem
          game={createMockGame({
            selectedThumbnail: "selected.jpg",
            thumbnail: "thumb.jpg",
          })}
        />
      );
      const img = screen.getByTestId("game-image");
      expect(img).toHaveAttribute("src", "selected.jpg");
    });
  });

  describe("admin features", () => {
    it("should show Visible badge for games in collection", () => {
      render(
        <GameRowItem
          game={createMockGame({
            collections: [{ id: "1", name: "Primary", type: "bgg_sync" }],
          })}
          isAdmin={true}
        />
      );
      expect(screen.getByText("Visible")).toBeInTheDocument();
    });

    it("should show Hidden badge for games not in collection", () => {
      render(
        <GameRowItem game={createMockGame({ collections: [] })} isAdmin={true} />
      );
      expect(screen.getByText("Hidden")).toBeInTheDocument();
    });

    it("should show checkbox when onSelect provided", () => {
      const onSelect = vi.fn();
      render(
        <GameRowItem
          game={createMockGame()}
          isAdmin={true}
          onSelect={onSelect}
        />
      );
      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });

    it("should call onSelect when checkbox clicked", () => {
      const onSelect = vi.fn();
      render(
        <GameRowItem
          game={createMockGame({ id: "123" })}
          isAdmin={true}
          onSelect={onSelect}
        />
      );

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);
      expect(onSelect).toHaveBeenCalledWith("123");
    });

    it("should show dropdown menu trigger", () => {
      render(<GameRowItem game={createMockGame()} isAdmin={true} />);
      expect(screen.getByRole("button", { name: /open menu/i })).toBeInTheDocument();
    });
  });

  describe("selection state", () => {
    it("should show checked checkbox when selected", () => {
      render(
        <GameRowItem
          game={createMockGame()}
          isAdmin={true}
          isSelected={true}
          onSelect={vi.fn()}
        />
      );

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();
    });

    it("should show unchecked checkbox when not selected", () => {
      render(
        <GameRowItem
          game={createMockGame()}
          isAdmin={true}
          isSelected={false}
          onSelect={vi.fn()}
        />
      );

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();
    });
  });

  describe("non-admin behavior", () => {
    it("should render as link when not admin", () => {
      render(<GameRowItem game={createMockGame({ id: "123" })} />);

      const link = screen.getByTestId("game-link");
      expect(link).toHaveAttribute("href", "/game/123");
    });

    it("should not show status badge when not admin", () => {
      render(<GameRowItem game={createMockGame()} isAdmin={false} />);
      expect(screen.queryByText("Visible")).not.toBeInTheDocument();
      expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
    });

    it("should not show dropdown menu when not admin", () => {
      render(<GameRowItem game={createMockGame()} isAdmin={false} />);
      expect(screen.queryByRole("button", { name: /open menu/i })).not.toBeInTheDocument();
    });
  });

  describe("scraping state", () => {
    it("should show scraped icon for scraped games", () => {
      render(<GameRowItem game={createMockGame({ lastScraped: "2024-01-01" })} />);
      // CheckCircle icon should be present (we check for its title)
      expect(screen.getByTitle("Scraped")).toBeInTheDocument();
    });

    it("should not show scraped icon for unscraped games", () => {
      render(<GameRowItem game={createMockGame({ lastScraped: null })} />);
      expect(screen.queryByTitle("Scraped")).not.toBeInTheDocument();
    });
  });

  describe("rating colors", () => {
    it("should render rating with color styling", () => {
      render(<GameRowItem game={createMockGame({ rating: 8.0 })} />);

      // Rating should be styled with background color
      const ratingBadge = screen.getByText("★ 8.0").closest("span");
      expect(ratingBadge).toHaveStyle({ backgroundColor: expect.any(String) });
    });
  });
});
