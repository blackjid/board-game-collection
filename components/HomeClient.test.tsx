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

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.print
const mockPrint = vi.fn();
Object.defineProperty(window, "print", { value: mockPrint });

describe("HomeClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
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

  const mockAdminUser = {
    id: "user-1",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
  };

  const defaultProps = {
    games: mockGames,
    totalGames: 3,
    collectionName: "Test Collection",
    bggUsername: "testuser",
    lastSyncedAt: new Date().toISOString(),
    currentUser: null,
  };

  describe("rendering", () => {
    it("should render collection name", () => {
      render(
        <HomeClient {...defaultProps} collectionName="My Board Games" />
      );

      // Multiple h1 elements exist (one for screen, one for print)
      const headings = screen.getAllByText("My Board Games");
      expect(headings.length).toBeGreaterThan(0);
    });

    it("should render default collection name from username", () => {
      render(
        <HomeClient {...defaultProps} collectionName={null} bggUsername="testuser" />
      );

      // Title is now split into name + "Collection" (multiple elements in screen and print headers)
      expect(screen.getAllByText("testuser's").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Collection").length).toBeGreaterThan(0);
    });

    it("should render fallback collection name when no username", () => {
      render(
        <HomeClient {...defaultProps} collectionName={null} bggUsername={null} />
      );

      // Title is now split into "Board Game" + "Collection" (multiple elements in screen and print headers)
      expect(screen.getAllByText("Board Game").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Collection").length).toBeGreaterThan(0);
    });

    it("should render total games count", () => {
      render(
        <HomeClient {...defaultProps} totalGames={42} />
      );

      // Multiple count elements exist (one for screen, one for print)
      const counts = screen.getAllByText("42 games");
      expect(counts.length).toBeGreaterThan(0);
    });

    it("should render all game cards in grid view", () => {
      render(<HomeClient {...defaultProps} />);

      expect(screen.getByText("Wingspan")).toBeInTheDocument();
      expect(screen.getByText("Catan")).toBeInTheDocument();
      expect(screen.getByText("Azul")).toBeInTheDocument();
    });

    it("should render Login link when not authenticated", () => {
      render(<HomeClient {...defaultProps} currentUser={null} />);

      expect(screen.getByText("Login")).toBeInTheDocument();
    });

    it("should render Experience link", () => {
      render(<HomeClient {...defaultProps} />);

      const experienceLinks = screen.getAllByRole("link").filter(
        link => link.getAttribute("href") === "/experience"
      );
      expect(experienceLinks.length).toBeGreaterThan(0);
    });
  });

  describe("auth-aware features", () => {
    it("should show user menu when logged in as admin", () => {
      render(<HomeClient {...defaultProps} currentUser={mockAdminUser} />);

      expect(screen.getByText("Admin User")).toBeInTheDocument();
    });

    it("should show sync button for admins", () => {
      render(<HomeClient {...defaultProps} currentUser={mockAdminUser} />);

      expect(screen.getByText("Sync")).toBeInTheDocument();
    });

    it("should not show sync button for guests", () => {
      render(<HomeClient {...defaultProps} currentUser={null} />);

      expect(screen.queryByText("Sync")).not.toBeInTheDocument();
    });

    it("should show last synced time for admins", () => {
      const syncedAt = new Date();
      syncedAt.setHours(syncedAt.getHours() - 2);

      render(
        <HomeClient
          {...defaultProps}
          currentUser={mockAdminUser}
          lastSyncedAt={syncedAt.toISOString()}
        />
      );

      expect(screen.getByText(/Synced 2h ago/)).toBeInTheDocument();
    });
  });

  describe("empty state / onboarding", () => {
    it("should render onboarding when no games", () => {
      render(
        <HomeClient {...defaultProps} games={[]} totalGames={0} currentUser={null} />
      );

      expect(screen.getByText("Welcome to Your Collection!")).toBeInTheDocument();
      expect(screen.getByText("Login to Get Started")).toBeInTheDocument();
    });

    it("should show Go to Settings when logged in with empty collection", () => {
      render(
        <HomeClient {...defaultProps} games={[]} totalGames={0} currentUser={mockAdminUser} />
      );

      expect(screen.getByText("Go to Settings")).toBeInTheDocument();
    });

    it("should show onboarding steps", () => {
      render(
        <HomeClient {...defaultProps} games={[]} totalGames={0} currentUser={null} />
      );

      expect(screen.getByText("Login as admin")).toBeInTheDocument();
      expect(screen.getByText("Set your BGG username")).toBeInTheDocument();
      expect(screen.getByText("Sync your collection")).toBeInTheDocument();
    });
  });

  describe("search functionality", () => {
    it("should filter games by search query", () => {
      render(<HomeClient {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search games...");
      fireEvent.change(searchInput, { target: { value: "wing" } });

      expect(screen.getByText("Wingspan")).toBeInTheDocument();
      expect(screen.queryByText("Catan")).not.toBeInTheDocument();
      expect(screen.queryByText("Azul")).not.toBeInTheDocument();
    });

    it("should show no results message when search has no matches", () => {
      render(<HomeClient {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search games...");
      fireEvent.change(searchInput, { target: { value: "xyz" } });

      expect(screen.getByText("No games found")).toBeInTheDocument();
      expect(screen.getByText(/No games match "xyz"/)).toBeInTheDocument();
    });

    it("should clear search when clear button clicked", () => {
      render(<HomeClient {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText("Search games...");
      fireEvent.change(searchInput, { target: { value: "wing" } });

      // Click clear button
      const clearButton = screen.getAllByRole("button").find(
        btn => btn.querySelector("svg path[d='M6 18L18 6M6 6l12 12']")
      );
      if (clearButton) fireEvent.click(clearButton);

      expect(screen.getByText("Wingspan")).toBeInTheDocument();
      expect(screen.getByText("Catan")).toBeInTheDocument();
      expect(screen.getByText("Azul")).toBeInTheDocument();
    });
  });

  describe("sorting", () => {
    it("should sort by name by default (A-Z)", () => {
      render(<HomeClient {...defaultProps} />);

      const gameNames = screen.getAllByRole("heading", { level: 3 }).map(h => h.textContent);
      expect(gameNames).toEqual(["Azul", "Catan", "Wingspan"]);
    });

    it("should sort by year when selected (newest first)", () => {
      render(<HomeClient {...defaultProps} />);

      const sortSelect = screen.getByRole("combobox");
      fireEvent.change(sortSelect, { target: { value: "year" } });

      const gameNames = screen.getAllByRole("heading", { level: 3 }).map(h => h.textContent);
      expect(gameNames).toEqual(["Wingspan", "Azul", "Catan"]); // 2019, 2017, 1995
    });

    it("should sort by rating when selected (highest first)", () => {
      render(<HomeClient {...defaultProps} />);

      const sortSelect = screen.getByRole("combobox");
      fireEvent.change(sortSelect, { target: { value: "rating" } });

      const gameNames = screen.getAllByRole("heading", { level: 3 }).map(h => h.textContent);
      expect(gameNames).toEqual(["Wingspan", "Azul", "Catan"]); // 8.1, 7.8, 7.2
    });
  });

  describe("view mode toggle", () => {
    it("should start in grid view", () => {
      render(<HomeClient {...defaultProps} />);

      // Grid view shows game cards, check for the grid class
      const container = screen.getByRole("main");
      expect(container.querySelector(".grid")).toBeTruthy();
    });

    it("should switch to list view when list button clicked", () => {
      render(<HomeClient {...defaultProps} />);

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
      render(<HomeClient {...defaultProps} />);

      const printButton = screen.getByText("Print Collection");
      fireEvent.click(printButton);

      expect(mockPrint).toHaveBeenCalled();
    });
  });

  describe("footer", () => {
    it("should render BGG link when username provided", () => {
      render(<HomeClient {...defaultProps} bggUsername="testuser" />);

      const bggLink = screen.getByText("View on BGG");
      expect(bggLink.getAttribute("href")).toBe(
        "https://boardgamegeek.com/collection/user/testuser"
      );
    });
  });
});
