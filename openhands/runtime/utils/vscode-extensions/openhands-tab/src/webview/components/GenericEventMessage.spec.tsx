import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GenericEventMessage } from "./GenericEventMessage";

describe("GenericEventMessage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders with title and content", () => {
    render(
      <GenericEventMessage
        title="🔧 Test Event"
        details="This is test content"
      />,
    );

    expect(screen.getByText("🔧 Test Event")).toBeTruthy();
    // Content is hidden by default (collapsed)
    expect(screen.queryByText("This is test content")).toBeNull();

    // Click to expand and show content
    const expandButton = screen.getByTitle("Show details");
    fireEvent.click(expandButton);
    expect(screen.getByText("This is test content")).toBeTruthy();
  });

  it("renders with success status", () => {
    render(
      <GenericEventMessage
        title="✅ Success Event"
        details="Operation completed"
        success="success"
      />,
    );

    expect(screen.getByText("✅ Success Event")).toBeTruthy();
    // Content is hidden by default
    expect(screen.queryByText("Operation completed")).toBeNull();

    // Expand to see content
    const expandButton = screen.getByTitle("Show details");
    fireEvent.click(expandButton);
    expect(screen.getByText("Operation completed")).toBeTruthy();

    // Check for success styling by looking for the success indicator
    expect(screen.getByText("✓")).toBeTruthy();
  });

  it("renders with error status", () => {
    render(
      <GenericEventMessage
        title="❌ Error Event"
        details="Something went wrong"
        success="error"
      />,
    );

    expect(screen.getByText("❌ Error Event")).toBeTruthy();
    // Content is hidden by default
    expect(screen.queryByText("Something went wrong")).toBeNull();

    // Expand to see content
    const expandButton = screen.getByTitle("Show details");
    fireEvent.click(expandButton);
    expect(screen.getByText("Something went wrong")).toBeTruthy();

    // Check for error styling by looking for the error indicator
    expect(screen.getByText("✗")).toBeTruthy();
  });

  it("toggles collapsed state when clicked", () => {
    render(
      <GenericEventMessage
        title="📋 Collapsible Event"
        details="This content can be collapsed"
      />,
    );

    const header = screen.getByText("📋 Collapsible Event");
    expect(header).toBeTruthy();

    // Content should be hidden initially (collapsed)
    expect(screen.queryByText("This content can be collapsed")).toBeNull();

    // Click to expand
    const expandButton = screen.getByTitle("Show details");
    fireEvent.click(expandButton);
    expect(screen.getByText("This content can be collapsed")).toBeTruthy();

    // Click to collapse
    const collapseButton = screen.getByTitle("Hide details");
    fireEvent.click(collapseButton);
    expect(screen.queryByText("This content can be collapsed")).toBeNull();
  });

  it("shows chevron icon when collapsible", () => {
    render(
      <GenericEventMessage title="📋 Collapsible Event" details="Content" />,
    );

    // Should show expand button when content exists
    expect(screen.getByTitle("Show details")).toBeTruthy();
  });

  it("does not show chevron when not collapsible", () => {
    render(<GenericEventMessage title="📋 Non-collapsible Event" details="" />);

    // Should not show expand button when no content
    expect(screen.queryByTitle("Show details")).toBeNull();
    expect(screen.queryByTitle("Hide details")).toBeNull();
  });

  it("renders without content", () => {
    render(<GenericEventMessage title="📋 Event Without Content" details="" />);

    expect(screen.getByText("📋 Event Without Content")).toBeTruthy();
    // Should not show expand button when no content
    expect(screen.queryByTitle("Show details")).toBeNull();
  });

  it("renders with custom content", () => {
    const customContent = (
      <div>
        <p>Custom content</p>
        <button>Action Button</button>
      </div>
    );

    render(
      <GenericEventMessage
        title="🔧 Event with Custom Content"
        details={customContent}
      />,
    );

    expect(screen.getByText("🔧 Event with Custom Content")).toBeTruthy();
    // Content is hidden by default
    expect(screen.queryByText("Custom content")).toBeNull();

    // Expand to see content
    const expandButton = screen.getByTitle("Show details");
    fireEvent.click(expandButton);
    expect(screen.getByText("Custom content")).toBeTruthy();
    expect(screen.getByText("Action Button")).toBeTruthy();
  });

  it("applies default styling correctly", () => {
    render(
      <GenericEventMessage
        title="📋 Default Event"
        details="Default content"
      />,
    );

    // Just check that the title renders - we can't easily test CSS classes without jest-dom
    expect(screen.getByText("📋 Default Event")).toBeTruthy();
  });

  it("handles empty title gracefully", () => {
    render(<GenericEventMessage title="" details="Content with empty title" />);

    // Content is hidden by default
    expect(screen.queryByText("Content with empty title")).toBeNull();

    // Expand to see content
    const expandButton = screen.getByTitle("Show details");
    fireEvent.click(expandButton);
    expect(screen.getByText("Content with empty title")).toBeTruthy();
  });

  it("handles missing icon gracefully", () => {
    render(
      <GenericEventMessage title="Event Without Icon" details="Content" />,
    );

    expect(screen.getByText("Event Without Icon")).toBeTruthy();
    // Content is hidden by default
    expect(screen.queryByText("Content")).toBeNull();

    // Expand to see content
    const expandButton = screen.getByTitle("Show details");
    fireEvent.click(expandButton);
    expect(screen.getByText("Content")).toBeTruthy();
  });
});
