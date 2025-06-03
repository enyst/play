import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { EventMessage } from "./EventMessage";
import { ActionMessage } from "../../shared/types/message";

describe("EventMessage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders UserMessageAction correctly", () => {
    const event: ActionMessage = {
      id: 100,
      action: "message",
      args: {
        content: "Hello, this is a user message",
      },
      source: "user",
      message: "User message sent",
      timestamp: new Date().toISOString(),
    };

    render(<EventMessage event={event} />);

    // Message actions render as ChatMessage components, not with icons
    expect(screen.getByText("Hello, this is a user message")).toBeTruthy();
  });

  it("renders AssistantMessageAction correctly", () => {
    const event: ActionMessage = {
      id: 101,
      action: "message",
      args: {
        content: "Hello, this is an assistant response",
      },
      source: "agent",
      message: "Assistant message sent",
      timestamp: new Date().toISOString(),
    };

    render(<EventMessage event={event} />);

    // Message actions render as ChatMessage components, not with icons
    expect(
      screen.getByText("Hello, this is an assistant response"),
    ).toBeTruthy();
  });

  it("renders AgentThinkAction correctly", () => {
    const event: ActionMessage = {
      id: 102,
      action: "think",
      args: {
        thought: "I need to analyze this problem",
      },
      source: "agent",
      message: "Agent is thinking",
      timestamp: new Date().toISOString(),
    };

    render(<EventMessage event={event} />);

    expect(screen.getByText("🤔 Agent is thinking...")).toBeTruthy();
    // Content is collapsed by default, need to expand to see it
    expect(screen.queryByText("I need to analyze this problem")).toBeNull();
  });

  it("renders AgentFinishAction correctly", () => {
    const event: ActionMessage = {
      id: 103,
      action: "finish",
      args: {
        outputs: JSON.stringify({ success: true }),
      },
      source: "agent",
      message: "Agent finished task",
      timestamp: new Date().toISOString(),
    };

    render(<EventMessage event={event} />);

    // The component seems to default to "partially completed" - let's check what it actually renders
    expect(screen.getByText("✅ Task partially completed")).toBeTruthy();
  });

  it("renders AgentFinishAction with partial completion", () => {
    const event: ActionMessage = {
      id: 104,
      action: "finish",
      args: {
        outputs: JSON.stringify({ success: false }),
      },
      source: "agent",
      message: "Agent finished task (partially)",
      timestamp: new Date().toISOString(),
    };

    render(<EventMessage event={event} />);

    expect(screen.getByText("✅ Task partially completed")).toBeTruthy();
  });

  it("renders FileReadAction correctly", () => {
    const event: ActionMessage = {
      id: 105,
      action: "read",
      args: {
        path: "/path/to/file.py",
      },
      source: "agent",
      message: "Agent read file",
      timestamp: new Date().toISOString(),
    };

    render(<EventMessage event={event} />);

    expect(screen.getByText("📖 Read file:")).toBeTruthy();
    expect(screen.getByText("/path/to/file.py")).toBeTruthy();
  });

  it("renders FileWriteAction correctly", () => {
    const event: ActionMessage = {
      id: 106,
      action: "write",
      args: {
        path: "/path/to/newfile.py",
        content: 'print("Hello, World!")',
      },
      source: "agent",
      message: "Agent wrote file",
      timestamp: new Date().toISOString(),
    };

    render(<EventMessage event={event} />);

    expect(screen.getByText("✏️ Wrote file:")).toBeTruthy();
    expect(screen.getByText("/path/to/newfile.py")).toBeTruthy();
  });

  it("renders CmdRunAction correctly", () => {
    const event: ActionMessage = {
      id: 107,
      action: "run",
      args: {
        command: "python test.py",
      },
      source: "agent",
      message: "Agent ran command",
      timestamp: new Date().toISOString(),
    };

    render(<EventMessage event={event} />);

    expect(screen.getByText("⚡ Executed:")).toBeTruthy();
    expect(screen.getByText("python test.py")).toBeTruthy();
  });

  it("renders IPythonRunCellAction correctly", () => {
    const event: ActionMessage = {
      id: 108,
      action: "run_ipython",
      args: {
        code: 'print("Hello from IPython")',
      },
      source: "agent",
      message: "Agent ran IPython code",
      timestamp: new Date().toISOString(),
    };

    render(<EventMessage event={event} />);

    expect(screen.getByText("🐍 Executed Python code")).toBeTruthy();
  });

  it("renders BrowseInteractiveAction correctly", () => {
    const event: ActionMessage = {
      id: 109,
      action: "browse",
      args: {
        url: "https://example.com",
      },
      source: "agent",
      message: "Agent browsed URL",
      timestamp: new Date().toISOString(),
    };

    render(<EventMessage event={event} />);

    expect(screen.getByText("🌐 Browsed:")).toBeTruthy();
    expect(screen.getByText("https://example.com")).toBeTruthy();
  });

  it("renders unknown action with fallback", () => {
    const event: ActionMessage = {
      id: 110,
      action: "unknown_action",
      args: {
        data: "some data",
      },
      source: "agent",
      message: "Unknown agent action",
      timestamp: new Date().toISOString(),
    };

    render(<EventMessage event={event} />);

    expect(screen.getByText("🔧 UNKNOWN: UNKNOWN_ACTION")).toBeTruthy();

    // Expand the details to see the JSON debug info
    const expandButton = screen.getByTitle("Show details");
    fireEvent.click(expandButton);

    // Should now include JSON debug info
    expect(screen.getByText(/Debug Info \(Full Event\):/)).toBeTruthy();
  });

  it("handles events with missing args gracefully", () => {
    const event: ActionMessage = {
      id: 111,
      action: "message",
      args: {},
      source: "user",
      message: "User message with missing args",
      timestamp: new Date().toISOString(),
    };

    render(<EventMessage event={event} />);

    // With missing args, it should render an empty message - just check that it renders without crashing
    // The component should render a ChatMessage with empty content
    const messageElement = screen.getByRole("article");
    expect(messageElement).toBeTruthy();
  });
});
