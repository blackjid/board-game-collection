import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateListDialog, EditListDialog, DeleteListDialog } from "./ListDialogs";

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ListDialogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  // ============================================================================
  // CreateListDialog
  // ============================================================================

  describe("CreateListDialog", () => {
    it("should render dialog when open", () => {
      render(
        <CreateListDialog open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByText("Create New List")).toBeInTheDocument();
      expect(screen.getByText("Create a curated list of games for a specific purpose.")).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(
        <CreateListDialog open={false} onOpenChange={vi.fn()} />
      );

      expect(screen.queryByText("Create New List")).not.toBeInTheDocument();
    });

    it("should have name and description inputs", () => {
      render(
        <CreateListDialog open={true} onOpenChange={vi.fn()} />
      );

      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Description (optional)")).toBeInTheDocument();
    });

    it("should disable Create button when name is empty", () => {
      render(
        <CreateListDialog open={true} onOpenChange={vi.fn()} />
      );

      const createButton = screen.getByRole("button", { name: "Create" });
      expect(createButton).toBeDisabled();
    });

    it("should enable Create button when name is provided", () => {
      render(
        <CreateListDialog open={true} onOpenChange={vi.fn()} />
      );

      const nameInput = screen.getByLabelText("Name");
      fireEvent.change(nameInput, { target: { value: "My List" } });

      const createButton = screen.getByRole("button", { name: "Create" });
      expect(createButton).not.toBeDisabled();
    });

    it("should call API when Create is clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ collection: { id: "1", name: "My List" } }),
      });

      const onOpenChange = vi.fn();
      render(
        <CreateListDialog open={true} onOpenChange={onOpenChange} />
      );

      const nameInput = screen.getByLabelText("Name");
      fireEvent.change(nameInput, { target: { value: "My List" } });

      const createButton = screen.getByRole("button", { name: "Create" });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/collections",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("My List"),
          })
        );
      });
    });

    it("should call onOpenChange(false) when Cancel clicked", () => {
      const onOpenChange = vi.fn();
      render(
        <CreateListDialog open={true} onOpenChange={onOpenChange} />
      );

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("should call onCreated callback when provided", async () => {
      const createdList = { id: "1", name: "New List", description: null };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ collection: createdList }),
      });

      const onCreated = vi.fn();
      const onOpenChange = vi.fn();
      render(
        <CreateListDialog open={true} onOpenChange={onOpenChange} onCreated={onCreated} />
      );

      const nameInput = screen.getByLabelText("Name");
      fireEvent.change(nameInput, { target: { value: "New List" } });

      const createButton = screen.getByRole("button", { name: "Create" });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(onCreated).toHaveBeenCalledWith(createdList);
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("should navigate when no onCreated callback", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ collection: { id: "123", name: "New List" } }),
      });

      render(
        <CreateListDialog open={true} onOpenChange={vi.fn()} />
      );

      const nameInput = screen.getByLabelText("Name");
      fireEvent.change(nameInput, { target: { value: "New List" } });

      const createButton = screen.getByRole("button", { name: "Create" });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/?collection=123");
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("should submit on Enter key in name input", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ collection: { id: "1", name: "Quick List" } }),
      });

      render(
        <CreateListDialog open={true} onOpenChange={vi.fn()} />
      );

      const nameInput = screen.getByLabelText("Name");
      fireEvent.change(nameInput, { target: { value: "Quick List" } });
      fireEvent.keyDown(nameInput, { key: "Enter" });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  // ============================================================================
  // EditListDialog
  // ============================================================================

  describe("EditListDialog", () => {
    const mockList = {
      id: "1",
      name: "Test List",
      description: "A test description",
    };

    it("should render dialog when open", () => {
      render(
        <EditListDialog open={true} onOpenChange={vi.fn()} list={mockList} />
      );

      expect(screen.getByText("Edit List")).toBeInTheDocument();
    });

    it("should populate form with list data", () => {
      render(
        <EditListDialog open={true} onOpenChange={vi.fn()} list={mockList} />
      );

      expect(screen.getByDisplayValue("Test List")).toBeInTheDocument();
      expect(screen.getByDisplayValue("A test description")).toBeInTheDocument();
    });

    it("should call API when Save is clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ collection: mockList }),
      });

      const onOpenChange = vi.fn();
      render(
        <EditListDialog open={true} onOpenChange={onOpenChange} list={mockList} />
      );

      const saveButton = screen.getByRole("button", { name: "Save" });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/collections/1",
          expect.objectContaining({
            method: "PATCH",
          })
        );
      });
    });

    it("should call onUpdated callback when provided", async () => {
      const updatedList = { ...mockList, name: "Updated List" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ collection: updatedList }),
      });

      const onUpdated = vi.fn();
      const onOpenChange = vi.fn();
      render(
        <EditListDialog
          open={true}
          onOpenChange={onOpenChange}
          list={mockList}
          onUpdated={onUpdated}
        />
      );

      const nameInput = screen.getByLabelText("Name");
      fireEvent.change(nameInput, { target: { value: "Updated List" } });

      const saveButton = screen.getByRole("button", { name: "Save" });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(onUpdated).toHaveBeenCalledWith(updatedList);
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("should disable Save button when name is empty", () => {
      render(
        <EditListDialog open={true} onOpenChange={vi.fn()} list={mockList} />
      );

      const nameInput = screen.getByLabelText("Name");
      fireEvent.change(nameInput, { target: { value: "" } });

      const saveButton = screen.getByRole("button", { name: "Save" });
      expect(saveButton).toBeDisabled();
    });
  });

  // ============================================================================
  // DeleteListDialog
  // ============================================================================

  describe("DeleteListDialog", () => {
    const mockList = {
      id: "1",
      name: "List to Delete",
      description: null,
    };

    it("should render dialog when open", () => {
      render(
        <DeleteListDialog open={true} onOpenChange={vi.fn()} list={mockList} />
      );

      expect(screen.getByText("Delete List")).toBeInTheDocument();
    });

    it("should show list name in confirmation message", () => {
      render(
        <DeleteListDialog open={true} onOpenChange={vi.fn()} list={mockList} />
      );

      expect(screen.getByText(/List to Delete/)).toBeInTheDocument();
    });

    it("should call API when Delete is clicked", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const onOpenChange = vi.fn();
      render(
        <DeleteListDialog open={true} onOpenChange={onOpenChange} list={mockList} />
      );

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/collections/1",
          expect.objectContaining({
            method: "DELETE",
          })
        );
      });
    });

    it("should call onDeleted callback when provided", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const onDeleted = vi.fn();
      const onOpenChange = vi.fn();
      render(
        <DeleteListDialog
          open={true}
          onOpenChange={onOpenChange}
          list={mockList}
          onDeleted={onDeleted}
        />
      );

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(onDeleted).toHaveBeenCalled();
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("should navigate when no onDeleted callback", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      render(
        <DeleteListDialog open={true} onOpenChange={vi.fn()} list={mockList} />
      );

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it("should close when Cancel is clicked", () => {
      const onOpenChange = vi.fn();
      render(
        <DeleteListDialog open={true} onOpenChange={onOpenChange} list={mockList} />
      );

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("should not call API when list is null", async () => {
      render(
        <DeleteListDialog open={true} onOpenChange={vi.fn()} list={null} />
      );

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(deleteButton);

      // Give it a moment to potentially call fetch
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
