import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { StatusBar } from "./StatusBar";

describe("StatusBar Component", () => {
  const mockOnStartNewConversation = vi.fn();

  const defaultProps = {
    isConnected: true,
    error: null,
    serverHealthy: true,
    statusMessage: null,
    onStartNewConversation: mockOnStartNewConversation,
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it('should render "Connected" when isConnected is true', () => {
    render(<StatusBar {...defaultProps} isConnected />);
    expect(screen.getByText("Connected")).toBeTruthy();
  });

  it('should render "Disconnected" when isConnected is false', () => {
    render(<StatusBar {...defaultProps} isConnected={false} />);
    expect(screen.getByText("Disconnected")).toBeTruthy();
  });

  it('should render server health as "Server OK" when serverHealthy is true', () => {
    render(<StatusBar {...defaultProps} serverHealthy />);
    expect(screen.getByText("Server OK")).toBeTruthy();
  });

  it('should render server health as "Server Down" when serverHealthy is false', () => {
    render(<StatusBar {...defaultProps} serverHealthy={false} />);
    expect(screen.getByText("Server Down")).toBeTruthy();
  });

  it('should render server health as "Checking..." when serverHealthy is null', () => {
    render(<StatusBar {...defaultProps} serverHealthy={null} />);
    expect(screen.getByText("Checking...")).toBeTruthy();
  });

  it("should display an error message when error prop is provided", () => {
    const errorMessage = "Network Error";
    render(<StatusBar {...defaultProps} error={errorMessage} />);
    expect(screen.getByText(errorMessage)).toBeTruthy();
    expect(screen.getByText("⚠️")).toBeTruthy(); // Check for error icon
  });

  it("should not display an error message when error prop is null", () => {
    render(<StatusBar {...defaultProps} error={null} />);
    expect(screen.queryByText("⚠️")).toBeNull();
  });

  it('should call onStartNewConversation when the new conversation button is clicked, have correct title, and contain "New" text', () => {
    render(<StatusBar {...defaultProps} />);
    const newConversationButton = screen.getByTitle("New Conversation"); // Find by title
    expect(newConversationButton).toBeTruthy();
    // The button should contain "New" text along with the SVG icon
    expect(newConversationButton.textContent).toBe("New");

    fireEvent.click(newConversationButton);
    expect(mockOnStartNewConversation).toHaveBeenCalledTimes(1);
  });

  it("should NOT display error message when an error exists but isConnected is false", () => {
    const errorMessage = "Detailed Fetch Error";
    render(
      <StatusBar
        {...defaultProps}
        isConnected={false}
        serverHealthy // serverHealthy could be true or null, disconnected takes precedence
        error={errorMessage}
      />,
    );
    expect(screen.queryByText(errorMessage)).toBeNull();
    expect(screen.queryByText("⚠️")).toBeNull();
    // Should still show "Disconnected"
    expect(screen.getByText("Disconnected")).toBeTruthy();
  });

  it("should NOT display error message when an error exists and isConnected is true but serverHealthy is false", () => {
    const errorMessage = "Detailed Fetch Error";
    render(
      <StatusBar
        {...defaultProps}
        isConnected
        serverHealthy={false}
        error={errorMessage}
      />,
    );
    expect(screen.queryByText(errorMessage)).toBeNull();
    expect(screen.queryByText("⚠️")).toBeNull();
    // Should still show "Connected" and "Server Down"
    expect(screen.getByText("Connected")).toBeTruthy();
    expect(screen.getByText("Server Down")).toBeTruthy();
  });

  it("should display error message when an error exists, isConnected is true, and serverHealthy is null", () => {
    const errorMessage = "Detailed Fetch Error";
    render(
      <StatusBar
        {...defaultProps}
        isConnected
        serverHealthy={null} // e.g. during initial check or if a check fails to determine status
        error={errorMessage}
      />,
    );
    expect(screen.getByText(errorMessage)).toBeTruthy();
    expect(screen.getByText("⚠️")).toBeTruthy();
    // Should still show "Connected" and "Checking..."
    expect(screen.getByText("Connected")).toBeTruthy();
    expect(screen.getByText("Checking...")).toBeTruthy();
  });

  it("should display status message when statusMessage prop is provided", () => {
    const statusMessage = "Setting up git hooks...";
    render(<StatusBar {...defaultProps} statusMessage={statusMessage} />);
    expect(screen.getByText(statusMessage)).toBeTruthy();
    expect(screen.getByText("🔄")).toBeTruthy(); // Check for status icon
  });

  it("should not display status message when statusMessage prop is null", () => {
    render(<StatusBar {...defaultProps} statusMessage={null} />);
    expect(screen.queryByText("🔄")).toBeNull();
  });

  it("should display both error and status message when both are provided", () => {
    const errorMessage = "Network Error";
    const statusMessage = "Setting up git hooks...";
    render(
      <StatusBar
        {...defaultProps}
        error={errorMessage}
        statusMessage={statusMessage}
      />,
    );
    expect(screen.getByText(errorMessage)).toBeTruthy();
    expect(screen.getByText("⚠️")).toBeTruthy();
    expect(screen.getByText(statusMessage)).toBeTruthy();
    expect(screen.getByText("🔄")).toBeTruthy();
  });
});
