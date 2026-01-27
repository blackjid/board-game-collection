import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GameTable } from "./GameTable";
import type { GameData } from "@/lib/games";

// Mock Next.js components
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <img alt={alt} src={src} data-testid="game-image" />
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
  expandsGames: [],
  requiredGames: [],
  expansions: [],
  requiredBy: [],
  ...overrides,
});

describe("GameTable", () => {
  describe("rendering", () => {
    it("should render game name", () => {
      const games = [createMockGame({ name: "Wingspan" })];
      render(<GameTable games={games} />);

      expect(screen.getByText("Wingspan")).toBeInTheDocument();
    });

    it("should render year published", () => {
      const games = [createMockGame({ yearPublished: 2019 })];
      render(<GameTable games={games} />);

      expect(screen.getByText("2019")).toBeInTheDocument();
    });

    it("should render rating", () => {
      const games = [createMockGame({ rating: 8.5 })];
      render(<GameTable games={games} />);

      expect(screen.getByText("8.5")).toBeInTheDocument();
    });

    it("should render player count", () => {
      const games = [createMockGame({ minPlayers: 2, maxPlayers: 4 })];
      render(<GameTable games={games} />);

      expect(screen.getByText("2-4")).toBeInTheDocument();
    });

    it("should render same player count without range", () => {
      const games = [createMockGame({ minPlayers: 2, maxPlayers: 2 })];
      render(<GameTable games={games} />);

      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should render playtime", () => {
      const games = [createMockGame({ minPlaytime: 30, maxPlaytime: 60 })];
      render(<GameTable games={games} />);

      expect(screen.getByText("30-60m")).toBeInTheDocument();
    });

    it("should render same playtime without range", () => {
      const games = [createMockGame({ minPlaytime: 45, maxPlaytime: 45 })];
      render(<GameTable games={games} />);

      expect(screen.getByText("45m")).toBeInTheDocument();
    });

    it("should render Exp badge for expansions", () => {
      const games = [createMockGame({ isExpansion: true })];
      render(<GameTable games={games} />);

      expect(screen.getByText("Exp")).toBeInTheDocument();
    });

    it("should render dash for missing year", () => {
      const games = [createMockGame({ yearPublished: null })];
      render(<GameTable games={games} />);

      // Should show dashes for missing data
      expect(screen.getAllByText("-").length).toBeGreaterThan(0);
    });

    it("should render multiple games", () => {
      const games = [
        createMockGame({ id: "1", name: "Game 1" }),
        createMockGame({ id: "2", name: "Game 2" }),
        createMockGame({ id: "3", name: "Game 3" }),
      ];
      render(<GameTable games={games} />);

      expect(screen.getByText("Game 1")).toBeInTheDocument();
      expect(screen.getByText("Game 2")).toBeInTheDocument();
      expect(screen.getByText("Game 3")).toBeInTheDocument();
    });
  });

  describe("sorting", () => {
    it("should show sort buttons", () => {
      const games = [createMockGame()];
      render(<GameTable games={games} />);

      expect(screen.getByRole("button", { name: /name/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /year/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /★/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /players/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /time/i })).toBeInTheDocument();
    });

    it("should call onSort when clicking sort button", () => {
      const onSort = vi.fn();
      const games = [createMockGame()];
      render(<GameTable games={games} onSort={onSort} />);

      fireEvent.click(screen.getByRole("button", { name: /name/i }));
      expect(onSort).toHaveBeenCalledWith("name");
    });
  });

  describe("admin features", () => {
    it("should hide In Collection column by default", () => {
      const games = [createMockGame()];
      render(<GameTable games={games} isAdmin={true} />);

      expect(screen.queryByText("In Collection")).not.toBeInTheDocument();
    });

    it("should show In Collection column when enabled", () => {
      const games = [createMockGame()];
      render(<GameTable games={games} isAdmin={true} showInCollectionColumn={true} />);

      expect(screen.getByText("In Collection")).toBeInTheDocument();
      expect(screen.getByText("Yes")).toBeInTheDocument();
    });

    it("should show Yes for games in primary collection", () => {
      const games = [createMockGame({ collections: [{ id: "col-1", name: "Primary", type: "bgg_sync" }] })];
      render(<GameTable games={games} isAdmin={true} showInCollectionColumn={true} />);

      expect(screen.getByText("Yes")).toBeInTheDocument();
    });

    it("should show No for games not in primary collection", () => {
      const games = [createMockGame({ collections: [] })];
      render(<GameTable games={games} isAdmin={true} showInCollectionColumn={true} />);

      expect(screen.getByText("No")).toBeInTheDocument();
    });

    it("should show No for games in manual collection only", () => {
      const games = [createMockGame({ collections: [{ id: "col-2", name: "Manual", type: "manual" }] })];
      render(<GameTable games={games} isAdmin={true} showInCollectionColumn={true} />);

      expect(screen.getByText("No")).toBeInTheDocument();
    });

    it("should show checkbox when onSelectGame provided", () => {
      const onSelectGame = vi.fn();
      const games = [createMockGame()];
      render(<GameTable games={games} isAdmin={true} onSelectGame={onSelectGame} />);

      const checkbox = screen.getByRole("checkbox", { name: /select test game/i });
      expect(checkbox).toBeInTheDocument();
    });

    it("should call onSelectGame when checkbox clicked", () => {
      const onSelectGame = vi.fn();
      const games = [createMockGame({ id: "123" })];
      render(<GameTable games={games} isAdmin={true} onSelectGame={onSelectGame} />);

      const checkbox = screen.getByRole("checkbox", { name: /select test game/i });
      fireEvent.click(checkbox);
      expect(onSelectGame).toHaveBeenCalledWith("123");
    });

    it("should show dropdown menu trigger for admins", () => {
      const games = [createMockGame()];
      render(<GameTable games={games} isAdmin={true} />);

      expect(screen.getByRole("button", { name: /open menu/i })).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("should highlight selected rows", () => {
      const games = [createMockGame({ id: "123" })];
      const selectedIds = new Set(["123"]);
      render(
        <GameTable
          games={games}
          isAdmin={true}
          selectedIds={selectedIds}
          onSelectGame={vi.fn()}
        />
      );

      const checkbox = screen.getByRole("checkbox", { name: /select test game/i });
      expect(checkbox).toBeChecked();
    });
  });

  describe("links", () => {
    it("should navigate to game page when row clicked", () => {
      const games = [createMockGame({ id: "123" })];
      render(<GameTable games={games} isAdmin={false} />);

      const row = screen.getByText("Test Game").closest("tr");
      fireEvent.click(row!);
      expect(mockPush).toHaveBeenCalledWith("/game/123");
    });
  });
});
