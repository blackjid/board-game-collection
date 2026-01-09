import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LogPlayDialog } from "./LogPlayDialog";

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
    onChange: (name: string, playerId?: string | null) => void;
    placeholder?: string;
    className?: string;
  }) => (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value, null)}
      placeholder={placeholder}
      className={className}
      data-testid="player-input"
    />
  ),
}));

// Mock fetch
global.fetch = vi.fn();

describe("LogPlayDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render dialog with form fields", () => {
    render(
      <LogPlayDialog
        open={true}
        onOpenChange={vi.fn()}
        gameId="game1"
        gameName="Test Game"
      />
    );

    expect(screen.getByText("Log Play - Test Game")).toBeInTheDocument();
    expect(screen.getByText("Record your game session")).toBeInTheDocument();
    expect(screen.getByText("Players *")).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(screen.getByLabelText("Location (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Duration (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes (optional)")).toBeInTheDocument();
  });

  it("should start with one empty player", () => {
    render(
      <LogPlayDialog
        open={true}
        onOpenChange={vi.fn()}
        gameId="game1"
        gameName="Test Game"
      />
    );

    const playerInputs = screen.getAllByPlaceholderText(/Player \d+ name/);
    expect(playerInputs).toHaveLength(1);
    expect(playerInputs[0]).toHaveValue("");
  });

  it("should add new players", () => {
    render(
      <LogPlayDialog
        open={true}
        onOpenChange={vi.fn()}
        gameId="game1"
        gameName="Test Game"
      />
    );

    const addButton = screen.getByRole("button", { name: /add player/i });
    fireEvent.click(addButton);

    const playerInputs = screen.getAllByPlaceholderText(/Player \d+ name/);
    expect(playerInputs).toHaveLength(2);
  });

  it("should remove players when more than one", () => {
    render(
      <LogPlayDialog
        open={true}
        onOpenChange={vi.fn()}
        gameId="game1"
        gameName="Test Game"
      />
    );

    // Add a second player
    const addButton = screen.getByRole("button", { name: /add player/i });
    fireEvent.click(addButton);

    // Find remove buttons
    const removeButtons = screen.getAllByTitle("Remove player");
    expect(removeButtons).toHaveLength(2);
    expect(removeButtons[0]).not.toBeDisabled();

    // Remove the second player
    fireEvent.click(removeButtons[1]);

    const playerInputs = screen.getAllByPlaceholderText(/Player \d+ name/);
    expect(playerInputs).toHaveLength(1);
  });

  it("should not remove the last player", () => {
    render(
      <LogPlayDialog
        open={true}
        onOpenChange={vi.fn()}
        gameId="game1"
        gameName="Test Game"
      />
    );

    const removeButtons = screen.getAllByTitle("Remove player");
    expect(removeButtons).toHaveLength(1);
    expect(removeButtons[0]).toBeDisabled();
  });

  it("should submit play with valid data", async () => {
    const mockFetch = vi.mocked(global.fetch);
    // First call: create player
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ player: { id: "player1", displayName: "Alice" } }),
    } as Response);
    // Second call: submit play
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ play: { id: "play1" } }),
    } as Response);

    const onOpenChange = vi.fn();
    const onPlayLogged = vi.fn();

    render(
      <LogPlayDialog
        open={true}
        onOpenChange={onOpenChange}
        gameId="game1"
        gameName="Test Game"
        onPlayLogged={onPlayLogged}
      />
    );

    // Fill in player name
    const playerInput = screen.getByPlaceholderText("Player 1 name");
    fireEvent.change(playerInput, { target: { value: "Alice" } });

    // Fill in location
    const locationInput = screen.getByLabelText("Location (optional)");
    fireEvent.change(locationInput, { target: { value: "Home" } });

    // Submit
    const submitButton = screen.getByRole("button", { name: /log play/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/plays",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("Alice"),
        })
      );
    });

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onPlayLogged).toHaveBeenCalled();
    });
  });

  it("should disable submit when no players have names", () => {
    render(
      <LogPlayDialog
        open={true}
        onOpenChange={vi.fn()}
        gameId="game1"
        gameName="Test Game"
      />
    );

    const submitButton = screen.getByRole("button", { name: /log play/i });
    expect(submitButton).toBeDisabled();
  });

  it("should toggle winner status", () => {
    render(
      <LogPlayDialog
        open={true}
        onOpenChange={vi.fn()}
        gameId="game1"
        gameName="Test Game"
      />
    );

    const winnerButton = screen.getByTitle("Mark as winner");
    expect(winnerButton).not.toHaveClass("bg-amber-600");

    fireEvent.click(winnerButton);
    expect(winnerButton).toHaveClass("bg-amber-600");
  });

  it("should toggle new player status", () => {
    render(
      <LogPlayDialog
        open={true}
        onOpenChange={vi.fn()}
        gameId="game1"
        gameName="Test Game"
      />
    );

    const newButton = screen.getByTitle("Mark as new");
    expect(newButton).not.toHaveClass("bg-emerald-600");

    fireEvent.click(newButton);
    expect(newButton).toHaveClass("bg-emerald-600");
  });
});
