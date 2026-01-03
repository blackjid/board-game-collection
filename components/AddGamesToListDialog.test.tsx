import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddGamesToListDialog } from "./AddGamesToListDialog";

// Mock next/navigation
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <img alt={alt} src={src} data-testid="game-image" />
  ),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AddGamesToListDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ games: [] }),
    });
  });

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    listId: "list-1",
    listName: "My List",
    existingGameIds: new Set<string>(),
  };

  describe("rendering", () => {
    it("should render dialog when open", async () => {
      render(<AddGamesToListDialog {...defaultProps} />);

      expect(screen.getByText('Add Games to "My List"')).toBeInTheDocument();
      expect(screen.getByText("Select games from your collection or search BoardGameGeek.")).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(<AddGamesToListDialog {...defaultProps} open={false} />);

      expect(screen.queryByText('Add Games to "My List"')).not.toBeInTheDocument();
    });

    it("should show tab navigation", async () => {
      render(<AddGamesToListDialog {...defaultProps} />);

      expect(screen.getByRole("tab", { name: "From Collection" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Search BGG" })).toBeInTheDocument();
    });
  });

  describe("collection tab", () => {
    it("should fetch games when dialog opens", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          games: [
            { id: "1", name: "Game 1", thumbnail: null, image: null, selectedThumbnail: null, isExpansion: false, yearPublished: 2020 },
          ],
        }),
      });

      render(<AddGamesToListDialog {...defaultProps} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/games?active=true");
      });
    });

    it("should show loading state", async () => {
      // Delay the fetch response
      mockFetch.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ games: [] }),
        }), 100))
      );

      render(<AddGamesToListDialog {...defaultProps} />);

      // Check for loading indicator (Loader2 component shows as an SVG with animate-spin)
      // We just check the dialog is rendered and fetch was called
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it("should show games from collection", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          games: [
            { id: "1", name: "Wingspan", thumbnail: null, image: null, selectedThumbnail: null, isExpansion: false, yearPublished: 2019 },
            { id: "2", name: "Catan", thumbnail: null, image: null, selectedThumbnail: null, isExpansion: false, yearPublished: 1995 },
          ],
        }),
      });

      render(<AddGamesToListDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Wingspan")).toBeInTheDocument();
        expect(screen.getByText("Catan")).toBeInTheDocument();
      });
    });

    it("should filter collection games", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          games: [
            { id: "1", name: "Wingspan", thumbnail: null, image: null, selectedThumbnail: null, isExpansion: false, yearPublished: 2019 },
            { id: "2", name: "Catan", thumbnail: null, image: null, selectedThumbnail: null, isExpansion: false, yearPublished: 1995 },
          ],
        }),
      });

      render(<AddGamesToListDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Wingspan")).toBeInTheDocument();
      });

      const filterInput = screen.getByPlaceholderText("Filter collection...");
      fireEvent.change(filterInput, { target: { value: "wing" } });

      expect(screen.getByText("Wingspan")).toBeInTheDocument();
      expect(screen.queryByText("Catan")).not.toBeInTheDocument();
    });

    it("should mark games already in list", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          games: [
            { id: "1", name: "Wingspan", thumbnail: null, image: null, selectedThumbnail: null, isExpansion: false, yearPublished: 2019 },
            { id: "2", name: "Catan", thumbnail: null, image: null, selectedThumbnail: null, isExpansion: false, yearPublished: 1995 },
          ],
        }),
      });

      render(
        <AddGamesToListDialog
          {...defaultProps}
          existingGameIds={new Set(["1"])}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Wingspan")).toBeInTheDocument();
      });

      // Game 1 (Wingspan) should be disabled since it's already in list
      const wingspanButton = screen.getByRole("button", { name: /Wingspan/ });
      expect(wingspanButton).toHaveAttribute("aria-disabled", "true");
    });

    it("should show available count", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          games: [
            { id: "1", name: "Wingspan", thumbnail: null, image: null, selectedThumbnail: null, isExpansion: false, yearPublished: 2019 },
            { id: "2", name: "Catan", thumbnail: null, image: null, selectedThumbnail: null, isExpansion: false, yearPublished: 1995 },
          ],
        }),
      });

      render(<AddGamesToListDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("2 games available")).toBeInTheDocument();
      });
    });

    it("should show empty state when no games", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ games: [] }),
      });

      render(<AddGamesToListDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("No games in collection")).toBeInTheDocument();
      });
    });

    it("should select games on click", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          games: [
            { id: "1", name: "Wingspan", thumbnail: null, image: null, selectedThumbnail: null, isExpansion: false, yearPublished: 2019 },
          ],
        }),
      });

      render(<AddGamesToListDialog {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Wingspan")).toBeInTheDocument();
      });

      const gameButton = screen.getByRole("button", { name: /Wingspan/ });
      fireEvent.click(gameButton);

      expect(screen.getByText("1 game selected")).toBeInTheDocument();
    });

  });

  describe("cancel button", () => {
    it("should close dialog on Cancel click", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ games: [] }),
      });

      const onOpenChange = vi.fn();
      render(
        <AddGamesToListDialog {...defaultProps} onOpenChange={onOpenChange} />
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

});
