import React from "react";
import { AgentEvent } from "../../shared/types";
import { ChatMessage } from "./ChatMessage";
import { GenericEventMessage } from "./GenericEventMessage";

interface EventMessageProps {
  event: AgentEvent;
}

export function EventMessage({ event }: EventMessageProps) {
  // Handle different event types based on the OpenHands event structure
  
  // User messages and assistant messages
  if (event.action === "message") {
    const content = event.args?.content || event.content || event.message || "";
    const thought = event.args?.thought;
    
    // If there's a thought, show it as the main message
    if (thought) {
      return (
        <ChatMessage 
          message={{
            id: `thought-${Date.now()}`,
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
          id: `msg-${Date.now()}`,
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
    const thought = event.args?.thought || event.content || "";
    return (
      <GenericEventMessage
        title="🤔 Agent is thinking..."
        details={thought}
      />
    );
  }

  // Finish actions
  if (event.action === "finish") {
    const finalThought = event.args?.final_thought || event.content || "";
    const taskCompleted = event.args?.task_completed || "unknown";
    
    return (
      <GenericEventMessage
        title={`✅ Task ${taskCompleted === "success" ? "completed successfully" : taskCompleted === "failure" ? "failed" : "partially completed"}`}
        details={finalThought}
        success={taskCompleted === "success" ? "success" : taskCompleted === "failure" ? "error" : "unknown"}
      />
    );
  }

  // File operations - show name only for VSCode integration later
  if (event.action === "read") {
    const path = event.args?.path || "unknown file";
    return (
      <GenericEventMessage
        title={<span>📖 Read file: <code className="font-mono text-xs bg-[var(--vscode-textCodeBlock-background)] px-1 rounded">{path}</code></span>}
        details="File content will be available in VS Code editor"
      />
    );
  }

  if (event.action === "write") {
    const path = event.args?.path || "unknown file";
    return (
      <GenericEventMessage
        title={<span>✏️ Wrote file: <code className="font-mono text-xs bg-[var(--vscode-textCodeBlock-background)] px-1 rounded">{path}</code></span>}
        details="File has been created/updated"
        success="success"
      />
    );
  }

  if (event.action === "edit") {
    const path = event.args?.path || "unknown file";
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
    const command = event.args?.command || "unknown command";
    const output = event.content || "";
    
    return (
      <GenericEventMessage
        title={<span>⚡ Executed: <code className="font-mono text-xs bg-[var(--vscode-textCodeBlock-background)] px-1 rounded">{command}</code></span>}
        details={output ? `Output:\n\`\`\`\n${output}\n\`\`\`` : "Command executed"}
        success={event.error ? "error" : "success"}
      />
    );
  }

  // Python code execution
  if (event.action === "run_ipython") {
    const code = event.args?.code || "unknown code";
    const output = event.content || "";
    
    return (
      <GenericEventMessage
        title="🐍 Executed Python code"
        details={output ? `Code:\n\`\`\`python\n${code}\n\`\`\`\n\nOutput:\n\`\`\`\n${output}\n\`\`\`` : `Code:\n\`\`\`python\n${code}\n\`\`\``}
        success={event.error ? "error" : "success"}
      />
    );
  }

  // Browse actions
  if (event.action === "browse") {
    const url = event.args?.url || "unknown URL";
    return (
      <GenericEventMessage
        title={<span>🌐 Browsed: <a href={url} className="text-[var(--vscode-textLink-foreground)] hover:underline" target="_blank" rel="noopener noreferrer">{url}</a></span>}
        details={event.content || "Page loaded"}
        success={event.error ? "error" : "success"}
      />
    );
  }

  // Error observations
  if (event.observation === "error" || event.error) {
    const errorContent = event.content || event.message || "Unknown error";
    return (
      <ChatMessage 
        message={{
          id: `error-${Date.now()}`,
          content: errorContent,
          sender: "assistant",
          timestamp: Date.now(),
          type: "error"
        }} 
      />
    );
  }

  // Generic observations
  if (event.observation) {
    const observationType = event.observation.toUpperCase();
    const content = event.content || event.message || "";
    
    return (
      <GenericEventMessage
        title={`📋 ${observationType}`}
        details={content}
        success={event.error ? "error" : "success"}
      />
    );
  }

  // Fallback for unknown event types
  const eventType = event.action || event.observation || "unknown";
  const basicContent = event.content || event.message || "";
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