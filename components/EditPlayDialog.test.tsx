import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EditPlayDialog } from "./EditPlayDialog";
import type { GamePlayData } from "@/types/play";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Mock PlayerInput component to simplify testing
vi.mock("./PlayerInput", () => ({
  PlayerInput: ({
    value,
    onChange,
    placeholder,
    className,
  }: {
    value: string;
    playerId?: string | null;
    isGuest?: boolean;
    onChange: (name: string, playerId?: string | null, isGuest?: boolean) => void;
    placeholder?: string;
    className?: string;
  }) => (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value, null, false)}
      placeholder={placeholder}
      className={className}
      data-testid="player-input"
    />
  ),
}));

// Mock fetch
global.fetch = vi.fn();

const mockPlay: GamePlayData = {
  id: "play1",
  gameId: "game1",
  loggedById: "user1",
  playedAt: new Date("2026-01-03T12:00:00Z"),
  location: "Home",
  duration: 60,
  notes: "Great game!",
  createdAt: new Date(),
  updatedAt: new Date(),
  game: {
    id: "game1",
    name: "Test Game",
    thumbnail: null,
  },
  loggedBy: {
    id: "user1",
    name: "Test User",
  },
  players: [
    { id: "p1", name: "Alice", isWinner: true, isNew: false },
    { id: "p2", name: "Bob", isWinner: false, isNew: true },
  ],
};

describe("EditPlayDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render dialog with pre-populated form fields", () => {
    render(
      <EditPlayDialog
        open={true}
        onOpenChange={vi.fn()}
        play={mockPlay}
      />
    );

    expect(screen.getByText("Edit Play - Test Game")).toBeInTheDocument();
    expect(screen.getByText("Update your game session details")).toBeInTheDocument();
    expect(screen.getByText("Players *")).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(screen.getByLabelText("Location (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Duration (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes (optional)")).toBeInTheDocument();
  });

  it("should pre-populate players from play data", () => {
    render(
      <EditPlayDialog
        open={true}
        onOpenChange={vi.fn()}
        play={mockPlay}
      />
    );

    const playerInputs = screen.getAllByPlaceholderText(/Player \d+ name/);
    expect(playerInputs).toHaveLength(2);
    expect(playerInputs[0]).toHaveValue("Alice");
    expect(playerInputs[1]).toHaveValue("Bob");
  });

  it("should pre-populate location from play data", () => {
    render(
      <EditPlayDialog
        open={true}
        onOpenChange={vi.fn()}
        play={mockPlay}
      />
    );

    const locationInput = screen.getByLabelText("Location (optional)");
    expect(locationInput).toHaveValue("Home");
  });

  it("should pre-populate duration from play data", () => {
    render(
      <EditPlayDialog
        open={true}
        onOpenChange={vi.fn()}
        play={mockPlay}
      />
    );

    const durationInput = screen.getByLabelText("Duration (optional)");
    expect(durationInput).toHaveValue(60);
  });

  it("should pre-populate notes from play data", () => {
    render(
      <EditPlayDialog
        open={true}
        onOpenChange={vi.fn()}
        play={mockPlay}
      />
    );

    const notesInput = screen.getByLabelText("Notes (optional)");
    expect(notesInput).toHaveValue("Great game!");
  });

  it("should add new players", () => {
    render(
      <EditPlayDialog
        open={true}
        onOpenChange={vi.fn()}
        play={mockPlay}
      />
    );

    const addButton = screen.getByRole("button", { name: /add player/i });
    fireEvent.click(addButton);

    const playerInputs = screen.getAllByPlaceholderText(/Player \d+ name/);
    expect(playerInputs).toHaveLength(3);
  });

  it("should remove players when more than one", () => {
    render(
      <EditPlayDialog
        open={true}
        onOpenChange={vi.fn()}
        play={mockPlay}
      />
    );

    // Find remove buttons (should have 2 - one for each player)
    const removeButtons = screen.getAllByTitle("Remove player");
    expect(removeButtons).toHaveLength(2);

    // Remove the second player
    fireEvent.click(removeButtons[1]);

    const playerInputs = screen.getAllByPlaceholderText(/Player \d+ name/);
    expect(playerInputs).toHaveLength(1);
    expect(playerInputs[0]).toHaveValue("Alice");
  });

  it("should submit updated play with valid data", async () => {
    const mockFetch = vi.mocked(global.fetch);
    // Players from existing plays without playerId are treated as guests,
    // so no player creation calls are made. Only the update play call happens.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ play: { id: "play1" } }),
    } as Response);

    const onOpenChange = vi.fn();
    const onPlayUpdated = vi.fn();

    render(
      <EditPlayDialog
        open={true}
        onOpenChange={onOpenChange}
        play={mockPlay}
        onPlayUpdated={onPlayUpdated}
      />
    );

    // Change location
    const locationInput = screen.getByLabelText("Location (optional)");
    fireEvent.change(locationInput, { target: { value: "Game Store" } });

    // Submit
    const submitButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/plays/play1",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("Game Store"),
        })
      );
    });

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onPlayUpdated).toHaveBeenCalled();
    });
  });

  it("should disable submit when no players have names", () => {
    const emptyPlayersPlay: GamePlayData = {
      ...mockPlay,
      players: [{ id: "p1", name: "", isWinner: false, isNew: false }],
    };

    render(
      <EditPlayDialog
        open={true}
        onOpenChange={vi.fn()}
        play={emptyPlayersPlay}
      />
    );

    const submitButton = screen.getByRole("button", { name: /save changes/i });
    expect(submitButton).toBeDisabled();
  });

  it("should show winner status for pre-populated players", () => {
    render(
      <EditPlayDialog
        open={true}
        onOpenChange={vi.fn()}
        play={mockPlay}
      />
    );

    const winnerButtons = screen.getAllByTitle(/winner|mark as winner/i);
    // Alice is winner, so first button should have amber background
    expect(winnerButtons[0]).toHaveClass("bg-amber-600");
  });

  it("should show new player status for pre-populated players", () => {
    render(
      <EditPlayDialog
        open={true}
        onOpenChange={vi.fn()}
        play={mockPlay}
      />
    );

    const newButtons = screen.getAllByTitle(/new|mark as new/i);
    // Bob is new, so second button should have emerald background
    expect(newButtons[1]).toHaveClass("bg-emerald-600");
  });

  it("should handle API errors gracefully", async () => {
    const mockFetch = vi.mocked(global.fetch);
    // Players from existing plays without playerId are treated as guests,
    // so no player creation calls are made. Only the update play call happens.
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Update failed" }),
    } as Response);

    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <EditPlayDialog
        open={true}
        onOpenChange={vi.fn()}
        play={mockPlay}
      />
    );

    const submitButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Update failed");
    });

    alertSpy.mockRestore();
  });
});
