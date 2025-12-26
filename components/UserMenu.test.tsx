import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UserMenu } from "./UserMenu";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>{children}</a>
  ),
}));

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
  });

  const mockAdminUser = {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    role: "admin",
  };

  const mockRegularUser = {
    id: "user-2",
    name: "Regular User",
    email: "regular@example.com",
    role: "user",
  };

  const mockAdminUserWithoutName = {
    id: "user-3",
    name: null,
    email: "noname@example.com",
    role: "admin",
  };

  describe("rendering", () => {
    it("should render user name when provided", () => {
      render(<UserMenu user={mockAdminUser} />);

      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    it("should render email username when name is null", () => {
      render(<UserMenu user={mockAdminUserWithoutName} />);

      expect(screen.getByText("noname")).toBeInTheDocument();
    });

    it("should render user initials in avatar", () => {
      render(<UserMenu user={mockAdminUser} />);

      expect(screen.getByText("T")).toBeInTheDocument();
    });

    it("should render dropdown arrow", () => {
      render(<UserMenu user={mockAdminUser} />);

      const button = screen.getByRole("button");
      expect(button.querySelector("svg")).toBeTruthy();
    });
  });

  describe("dropdown toggle", () => {
    it("should open dropdown when clicked", () => {
      render(<UserMenu user={mockAdminUser} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Manage Collection")).toBeInTheDocument();
      expect(screen.getByText("Sign out")).toBeInTheDocument();
    });

    it("should show user email in dropdown", () => {
      render(<UserMenu user={mockAdminUser} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("should show user role badge", () => {
      render(<UserMenu user={mockAdminUser} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByText("admin")).toBeInTheDocument();
    });

    it("should close dropdown when clicked again", () => {
      render(<UserMenu user={mockAdminUser} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);
      expect(screen.getByText("Settings")).toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.queryByText("Sign out")).not.toBeInTheDocument();
    });

    it("should close dropdown when clicking outside", () => {
      render(
        <div>
          <UserMenu user={mockAdminUser} />
          <div data-testid="outside">Outside</div>
        </div>
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);
      expect(screen.getByText("Settings")).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId("outside"));
      expect(screen.queryByText("Sign out")).not.toBeInTheDocument();
    });
  });

  describe("navigation links", () => {
    it("should have Settings link to /settings", () => {
      render(<UserMenu user={mockAdminUser} />);

      fireEvent.click(screen.getByRole("button"));

      const settingsLink = screen.getByText("Settings").closest("a");
      expect(settingsLink).toHaveAttribute("href", "/settings");
    });

    it("should have Manage Collection link to /settings?section=collection", () => {
      render(<UserMenu user={mockAdminUser} />);

      fireEvent.click(screen.getByRole("button"));

      const collectionLink = screen.getByText("Manage Collection").closest("a");
      expect(collectionLink).toHaveAttribute("href", "/settings?section=collection");
    });

    it("should close dropdown when clicking Settings", () => {
      render(<UserMenu user={mockAdminUser} />);

      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByText("Settings"));

      expect(screen.queryByText("Sign out")).not.toBeInTheDocument();
    });
  });

  describe("logout", () => {
    it("should call logout API when Sign out is clicked", async () => {
      render(<UserMenu user={mockAdminUser} />);

      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByText("Sign out"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
      });
    });

    it("should refresh the page after logout", async () => {
      render(<UserMenu user={mockAdminUser} />);

      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByText("Sign out"));

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe("accessibility", () => {
    it("should have accessible button", () => {
      render(<UserMenu user={mockAdminUser} />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("should have visible links in dropdown for admin", () => {
      render(<UserMenu user={mockAdminUser} />);

      fireEvent.click(screen.getByRole("button"));

      const links = screen.getAllByRole("link");
      expect(links.length).toBe(2); // Settings and Manage Collection
    });

    it("should have no links in dropdown for regular user", () => {
      render(<UserMenu user={mockRegularUser} />);

      fireEvent.click(screen.getByRole("button"));

      const links = screen.queryAllByRole("link");
      expect(links.length).toBe(0); // No admin links
    });
  });

  describe("role-based menu items", () => {
    it("should show Settings link for admin users", () => {
      render(<UserMenu user={mockAdminUser} />);

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("should show Manage Collection link for admin users", () => {
      render(<UserMenu user={mockAdminUser} />);

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("Manage Collection")).toBeInTheDocument();
    });

    it("should NOT show Settings link for regular users", () => {
      render(<UserMenu user={mockRegularUser} />);

      fireEvent.click(screen.getByRole("button"));

      expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });

    it("should NOT show Manage Collection link for regular users", () => {
      render(<UserMenu user={mockRegularUser} />);

      fireEvent.click(screen.getByRole("button"));

      expect(screen.queryByText("Manage Collection")).not.toBeInTheDocument();
    });

    it("should always show Sign out for all users", () => {
      render(<UserMenu user={mockRegularUser} />);

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("Sign out")).toBeInTheDocument();
    });

    it("should show user role badge for regular users", () => {
      render(<UserMenu user={mockRegularUser} />);

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("user")).toBeInTheDocument();
    });

    it("should still allow regular users to log out", async () => {
      render(<UserMenu user={mockRegularUser} />);

      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByText("Sign out"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
      });
    });
  });
});
