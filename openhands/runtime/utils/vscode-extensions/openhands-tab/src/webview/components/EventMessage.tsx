import React from "react";
import { SocketMessage, ActionMessage, ObservationMessage } from "../../shared/types";
import { ChatMessage } from "./ChatMessage";
import { GenericEventMessage } from "./GenericEventMessage";
import { useVSCodeAPI } from "../hooks/useVSCodeAPI";

interface EventMessageProps {
  event: SocketMessage;
}

// Type guards
function isActionMessage(event: SocketMessage): event is ActionMessage {
  return 'action' in event;
}

function isObservationMessage(event: SocketMessage): event is ObservationMessage {
  return 'observation' in event;
}

export function EventMessage({ event }: EventMessageProps) {
  const vscode = useVSCodeAPI();
  
  // Handle ActionMessage types
  if (isActionMessage(event)) {
    // User messages and assistant messages
    if (event.action === "message") {
      const content = (event.args?.content as string) || event.message || "";
      const thought = event.args?.thought as string;
      
      // If there's a thought, show it as the main message
      if (thought) {
        return (
          <ChatMessage 
            message={{
              id: `thought-${event.id || Date.now()}`,
              content: thought,
              sender: "assistant",
              timestamp: Date.now(),
              type: "message"
            }} 
          />
        );
      }
      
      // Regular message
      return (
        <ChatMessage 
          message={{
            id: `msg-${event.id || Date.now()}`,
            content,
            sender: "assistant",
            timestamp: Date.now(),
            type: "message"
          }} 
        />
      );
    }

    // Think actions - show as collapsible
    if (event.action === "think") {
      const thought = (event.args?.thought as string) || event.message || "";
      return (
        <GenericEventMessage
          title="🤔 Agent is thinking..."
          details={thought}
        />
      );
    }

    // Finish actions
    if (event.action === "finish") {
      const finalThought = (event.args?.final_thought as string) || event.message || "";
      const taskCompleted = event.args?.task_completed || "unknown";
      
      return (
        <GenericEventMessage
          title={`✅ Task ${taskCompleted === "success" ? "completed successfully" : taskCompleted === "failure" ? "failed" : "partially completed"}`}
          details={finalThought}
          success={taskCompleted === "success" ? "success" : taskCompleted === "failure" ? "error" : "unknown"}
        />
      );
    }

    // File operations - show name and open in VSCode
    if (event.action === "read") {
      const path = (event.args?.path as string) || "unknown file";

      const handleOpenFileClick = (filePath: string) => {
        if (filePath === "unknown file") return;
        vscode.postMessage({ type: "openFile", data: { path: filePath } });
      };

      return (
        <GenericEventMessage
          title={
            <span>
              📖 Read file:{" "}
              <button
                onClick={() => handleOpenFileClick(path)}
                className="text-[var(--vscode-textLink-foreground)] hover:underline focus:outline-none disabled:opacity-50 disabled:no-underline"
                title={path === "unknown file" ? "File path is unknown" : `Click to open ${path}`}
                disabled={path === "unknown file"}
              >
                <code className="font-mono text-xs bg-[var(--vscode-textCodeBlock-background)] px-1 rounded">
                  {path}
                </code>
              </button>
            </span>
          }
          details="Click path to open file in VS Code editor."
        />
      );
    }

    if (event.action === "write") {
      const path = (event.args?.path as string) || "unknown file";
      return (
        <GenericEventMessage
          title={<span>✏️ Wrote file: <code className="font-mono text-xs bg-[var(--vscode-textCodeBlock-background)] px-1 rounded">{path}</code></span>}
          details="File has been created/updated"
          success="success"
        />
      );
    }

    if (event.action === "edit") {
      const path = (event.args?.path as string) || "unknown file";
      return (
        <GenericEventMessage
          title={<span>✏️ Edited file: <code className="font-mono text-xs bg-[var(--vscode-textCodeBlock-background)] px-1 rounded">{path}</code></span>}
          details="File changes will be visible in VS Code editor"
          success="success"
        />
      );
    }

    // Command execution - show command only for VSCode integration later
    if (event.action === "run") {
      const command = (event.args?.command as string) || "unknown command";
      
      return (
        <GenericEventMessage
          title={<span>⚡ Executed: <code className="font-mono text-xs bg-[var(--vscode-textCodeBlock-background)] px-1 rounded">{command}</code></span>}
          details="Command executed"
        />
      );
    }

    // Python code execution
    if (event.action === "run_ipython") {
      const code = (event.args?.code as string) || "unknown code";
      
      return (
        <GenericEventMessage
          title="🐍 Executed Python code"
          details={`Code:\n\`\`\`python\n${code}\n\`\`\``}
        />
      );
    }

    // Browse actions
    if (event.action === "browse") {
      const url = (event.args?.url as string) || "unknown URL";
      return (
        <GenericEventMessage
          title={<span>🌐 Browsed: <a href={url} className="text-[var(--vscode-textLink-foreground)] hover:underline" target="_blank" rel="noopener noreferrer">{url}</a></span>}
          details="Page loaded"
        />
      );
    }
  }

  // Handle ObservationMessage types
  if (isObservationMessage(event)) {
    // Error observations
    if (event.observation === "error") {
      const errorContent = event.content || event.message || "Unknown error";
      return (
        <ChatMessage 
          message={{
            id: `error-${event.id || Date.now()}`,
            content: errorContent,
            sender: "assistant",
            timestamp: Date.now(),
            type: "error"
          }} 
        />
      );
    }

    // Generic observations
    const observationType = event.observation.toUpperCase();
    const content = event.content || event.message || "";
    
    return (
      <GenericEventMessage
        title={`📋 ${observationType}`}
        details={content}
      />
    );
  }

  // Fallback for unknown event types (StatusMessage or unknown)
  const eventType = isActionMessage(event) ? event.action : 
                   isObservationMessage(event) ? event.observation : 
                   "status_update" in event ? "status" : "unknown";
  const basicContent = isObservationMessage(event) ? event.content : 
                      isActionMessage(event) ? event.message : 
                      "message" in event ? event.message : "";
  const jsonDebugInfo = JSON.stringify(event, null, 2);
  
  const debugDetails = basicContent 
    ? `${basicContent}\n\n**Debug Info (Full Event):**\n\`\`\`json\n${jsonDebugInfo}\n\`\`\``
    : `**Debug Info (Full Event):**\n\`\`\`json\n${jsonDebugInfo}\n\`\`\``;
  
  return (
    <GenericEventMessage
      title={`🔧 UNKNOWN: ${eventType.toUpperCase()}`}
      details={debugDetails}
      success="error"
    />
  );
}