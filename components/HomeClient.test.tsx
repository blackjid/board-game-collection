import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HomeClient } from "./HomeClient";
import type { GameData } from "@/lib/games";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock window.print
const mockPrint = vi.fn();
Object.defineProperty(window, "print", { value: mockPrint });

describe("HomeClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockGame = (overrides: Partial<GameData> = {}): GameData => ({
    id: "1",
    name: "Test Game",
    yearPublished: 2020,
    image: "test.jpg",
    thumbnail: null,
    selectedThumbnail: null,
    description: "A test game",
    minPlayers: 2,
    maxPlayers: 4,
    minPlaytime: 30,
    maxPlaytime: 60,
    rating: 7.5,
    minAge: 10,
    categories: [],
    mechanics: [],
    isExpansion: false,
    availableImages: [],
    componentImages: [],
    ...overrides,
  });

  const mockGames: GameData[] = [
    createMockGame({ id: "1", name: "Wingspan", yearPublished: 2019, rating: 8.1 }),
    createMockGame({ id: "2", name: "Catan", yearPublished: 1995, rating: 7.2 }),
    createMockGame({ id: "3", name: "Azul", yearPublished: 2017, rating: 7.8 }),
  ];

  describe("rendering", () => {
    it("should render collection name", () => {
      render(
        <HomeClient
          games={mockGames}
          totalGames={3}
          collectionName="My Board Games"
          bggUsername="testuser"
        />
      );

      // Multiple h1 elements exist (one for screen, one for print)
      const headings = screen.getAllByText("My Board Games");
      expect(headings.length).toBeGreaterThan(0);
    });

    it("should render default collection name from username", () => {
      render(
        <HomeClient
          games={mockGames}
          totalGames={3}
          collectionName={null}
          bggUsername="testuser"
        />
      );

      const headings = screen.getAllByText("testuser's collection");
      expect(headings.length).toBeGreaterThan(0);
    });

    it("should render fallback collection name when no username", () => {
      render(
        <HomeClient
          games={mockGames}
          totalGames={3}
          collectionName={null}
          bggUsername={null}
        />
      );

      const headings = screen.getAllByText("My Collection");
      expect(headings.length).toBeGreaterThan(0);
    });

    it("should render total games count", () => {
      render(
        <HomeClient
          games={mockGames}
          totalGames={42}
          collectionName="Test"
          bggUsername="user"
        />
      );

      // Multiple count elements exist (one for screen, one for print)
      const counts = screen.getAllByText("42 games");
      expect(counts.length).toBeGreaterThan(0);
    });

    it("should render all game cards in grid view", () => {
      render(
        <HomeClient
          games={mockGames}
          totalGames={3}
          collectionName="Test"
          bggUsername="user"
        />
      );

      expect(screen.getByText("Wingspan")).toBeInTheDocument();
      expect(screen.getByText("Catan")).toBeInTheDocument();
      expect(screen.getByText("Azul")).toBeInTheDocument();
    });

    it("should render Settings link", () => {
      render(
        <HomeClient
          games={mockGames}
          totalGames={3}
          collectionName="Test"
          bggUsername="user"
        />
      );

      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("should render Experience link", () => {
      render(
        <HomeClient
          games={mockGames}
          totalGames={3}
          collectionName="Test"
          bggUsername="user"
        />
      );

      const experienceLinks = screen.getAllByRole("link").filter(
        link => link.getAttribute("href") === "/experience"
      );
      expect(experienceLinks.length).toBeGreaterThan(0);
    });
  });

  describe("empty state", () => {
    it("should render empty state when no games", () => {
      render(
        <HomeClient
          games={[]}
          totalGames={0}
          collectionName="Test"
          bggUsername="user"
        />
      );

      expect(screen.getByText("No games yet")).toBeInTheDocument();
      expect(
        screen.getByText(/Import your BGG collection/)
      ).toBeInTheDocument();
    });

    it("should link to settings in empty state", () => {
      render(
        <HomeClient
          games={[]}
          totalGames={0}
          collectionName="Test"
          bggUsername="user"
        />
      );

      expect(screen.getByText("Go to Settings")).toBeInTheDocument();
    });
  });

  describe("sorting", () => {
    it("should sort by name by default (A-Z)", () => {
      render(
        <HomeClient
          games={mockGames}
          totalGames={3}
          collectionName="Test"
          bggUsername="user"
        />
      );

      const gameNames = screen.getAllByRole("heading", { level: 3 }).map(h => h.textContent);
      expect(gameNames).toEqual(["Azul", "Catan", "Wingspan"]);
    });

    it("should sort by year when selected (newest first)", () => {
      render(
        <HomeClient
          games={mockGames}
          totalGames={3}
          collectionName="Test"
          bggUsername="user"
        />
      );

      const sortSelect = screen.getByRole("combobox");
      fireEvent.change(sortSelect, { target: { value: "year" } });

      const gameNames = screen.getAllByRole("heading", { level: 3 }).map(h => h.textContent);
      expect(gameNames).toEqual(["Wingspan", "Azul", "Catan"]); // 2019, 2017, 1995
    });

    it("should sort by rating when selected (highest first)", () => {
      render(
        <HomeClient
          games={mockGames}
          totalGames={3}
          collectionName="Test"
          bggUsername="user"
        />
      );

      const sortSelect = screen.getByRole("combobox");
      fireEvent.change(sortSelect, { target: { value: "rating" } });

      const gameNames = screen.getAllByRole("heading", { level: 3 }).map(h => h.textContent);
      expect(gameNames).toEqual(["Wingspan", "Azul", "Catan"]); // 8.1, 7.8, 7.2
    });
  });

  describe("view mode toggle", () => {
    it("should start in grid view", () => {
      render(
        <HomeClient
          games={mockGames}
          totalGames={3}
          collectionName="Test"
          bggUsername="user"
        />
      );

      // Grid view shows game cards, check for the grid class
      const container = screen.getByRole("main");
      expect(container.querySelector(".grid")).toBeTruthy();
    });

    it("should switch to list view when list button clicked", () => {
      render(
        <HomeClient
          games={mockGames}
          totalGames={3}
          collectionName="Test"
          bggUsername="user"
        />
      );

      const buttons = screen.getAllByRole("button");
      const listButton = buttons.find(b => b.getAttribute("title") === "List view");

      if (listButton) {
        fireEvent.click(listButton);
      }

      // In list view, we should have flex column layout instead of grid
      const container = screen.getByRole("main");
      expect(container.querySelector(".flex.flex-col")).toBeTruthy();
    });
  });

  describe("print functionality", () => {
    it("should call window.print when print button clicked", () => {
      render(
        <HomeClient
          games={mockGames}
          totalGames={3}
          collectionName="Test"
          bggUsername="user"
        />
      );

      const printButton = screen.getByText("Print");
      fireEvent.click(printButton);

      expect(mockPrint).toHaveBeenCalled();
    });
  });

  describe("footer", () => {
    it("should render BGG link when username provided", () => {
      render(
        <HomeClient
          games={mockGames}
          totalGames={3}
          collectionName="Test"
          bggUsername="testuser"
        />
      );

      const bggLink = screen.getByText("collection on BGG");
      expect(bggLink.getAttribute("href")).toBe(
        "https://boardgamegeek.com/collection/user/testuser"
      );
    });
  });
});
