import React from "react";
import { SocketMessage } from "../../shared/types";
import { ChatMessage } from "./ChatMessage";
import { GenericEventMessage } from "./GenericEventMessage";
import { useVSCodeAPI } from "../hooks/useVSCodeAPI";
import { isActionMessage, isObservationMessage, isStatusMessage } from "../utils/typeGuards";

interface EventMessageProps {
  event: SocketMessage;
}

export function EventMessage({ event }: EventMessageProps) {
  const vscode = useVSCodeAPI();

  // Handle ActionMessage types
  if (isActionMessage(event)) {
    // User messages and assistant messages
    if (event.action === "message") {
      const content = typeof event.args?.content === 'string' ? event.args.content : event.message || "";
      const thought = typeof event.args?.thought === 'string' ? event.args.thought : undefined;

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
      const thought = typeof event.args?.thought === 'string' ? event.args.thought : event.message || "";
      return (
        <GenericEventMessage
          title="🤔 Agent is thinking..."
          details={thought}
        />
      );
    }

    // Finish actions
    if (event.action === "finish") {
      const finalThought = typeof event.args?.final_thought === 'string' ? event.args.final_thought : event.message || "";
      const taskCompleted = typeof event.args?.task_completed === 'string' ? event.args.task_completed : "unknown";

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
      const path = typeof event.args?.path === 'string' ? event.args.path : "unknown file";

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
      const path = typeof event.args?.path === 'string' ? event.args.path : "unknown file";
      return (
        <GenericEventMessage
          title={<span>✏️ Wrote file: <code className="font-mono text-xs bg-[var(--vscode-textCodeBlock-background)] px-1 rounded">{path}</code></span>}
          details="File has been created/updated"
          success="success"
        />
      );
    }

    if (event.action === "edit") {
      const path = typeof event.args?.path === 'string' ? event.args.path : "unknown file";
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
      const command = typeof event.args?.command === 'string' ? event.args.command : "unknown command";

      return (
        <GenericEventMessage
          title="Run Command"
          details={`Command: ${command}`}
        />
      );
    }

    // Python code execution
    if (event.action === "run_ipython") {
      const code = typeof event.args?.code === 'string' ? event.args.code : "unknown code";

      return (
        <GenericEventMessage
          title="🐍 Executed Python code"
          details={`Code:\n\`\`\`python\n${code}\n\`\`\``}
        />
      );
    }

    // Browse actions
    if (event.action === "browse") {
      const url = typeof event.args?.url === 'string' ? event.args.url : "unknown URL";
      return (
        <GenericEventMessage
          title={<span>🌐 Browsed: <a href={url} className="text-[var(--vscode-textLink-foreground)] hover:underline" target="_blank" rel="noopener noreferrer">{url}</a></span>}
          details="Page loaded"
        />
      );
    } // End of 'browse' action handler

    // Recall actions
    if (event.action === "recall") {
      const thoughtArg = typeof event.args?.thought === 'string' ? event.args.thought : null;
      const queryArg = typeof event.args?.query === 'string' ? event.args.query : null;
      const recallTypeArg = typeof event.args?.recall_type === 'string' ? event.args.recall_type : null;

      let detailsContent = "";
      if (thoughtArg) {
        // If a thought is provided, use it as the primary detail.
        detailsContent += thoughtArg;
      } else {
        // Default message if no specific thought is in args.
        detailsContent += "Agent is recalling information.";
      }

      if (queryArg) {
        detailsContent += `\nQuery: ${queryArg}`;
      }
      if (recallTypeArg) {
        detailsContent += `\nType: ${recallTypeArg}`;
      }

      // If detailsContent is still the generic "Agent is recalling information."
      // and no other specific arguments (query, type) were present,
      // provide a slightly more user-friendly default.
      if (detailsContent === "Agent is recalling information." && !queryArg && !recallTypeArg) {
          detailsContent = "Agent is attempting to recall relevant information or context based on the current conversation.";
      }

      return (
        <GenericEventMessage
          title={<span className="text-[var(--vscode-disabledForeground)]">Looking for context...</span>}
          details={detailsContent + `\n\n**Debug Info (Full Event):**\n\`\`\`json\n${JSON.stringify(event, null, 2)}\n\`\`\``}
        />
      );
    }

    // Handle system prompt (action: "system_message_set")
    // FIXME: this is hallucination!
    if (event.action === "system_message_set") {
      // The primary content of the system message is in event.message
      const systemPromptContent = typeof event.message === 'string'
        ? event.message
        : "System prompt content not found in event.message.";

      // The event.args contains metadata like version, agent_class.
      // We'll include the full event in debug details.
      const detailsWithDebug = systemPromptContent + `\n\n**Debug Info (Full Event):**\n\`\`\`json\n${JSON.stringify(event, null, 2)}\n\`\`\``;

      return (
        <GenericEventMessage
          title="System Message"
          details={detailsWithDebug}
        />
      );
    }

  } // End of 'if (isActionMessage(event))' block

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

    // RecallObservation
    if (event.observation === "recall") {
      let detailsMarkdown = "";

      if (event.content && String(event.content).trim() !== "") {
        detailsMarkdown += `**Content:**\n\`\`\`\n${String(event.content)}\n\`\`\`\n\n`;
      } else {
        detailsMarkdown += "**Content:** (No direct content provided)\n\n";
      }

      if (event.extras && Object.keys(event.extras).length > 0) {
        detailsMarkdown += "**Details (from extras):**\n";
        for (const key in event.extras) {
          if (Object.prototype.hasOwnProperty.call(event.extras, key)) {
            const value = event.extras[key];
            // Format values, ensuring objects/arrays are stringified
            const formattedValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
            detailsMarkdown += `- **${key}:** ${formattedValue.includes('\n') ? `\n  \`\`\`\n  ${formattedValue.replace(/^/gm, '  ')}\n  \`\`\`` : formattedValue}\n`;

          }
        }
        detailsMarkdown += "\\n";
      } else {
        detailsMarkdown += "**Details (from extras):** (No additional details provided)\n\n";
      }

      detailsMarkdown += `**Debug Info (Full Event):**\n\`\`\`json\n${JSON.stringify(event, null, 2)}\n\`\`\``;

      return (
        <GenericEventMessage
          title={<span className="text-[var(--vscode-disabledForeground)]">Context Retrieved</span>}
          details={detailsMarkdown}
        />
      );

    }

    // Generic observations
    const observationType = event.observation.toUpperCase();
    // For 'run' observation, 'commandOutputForDetails' will be the command output for the collapsible details section,
    // and 'event.message' will be the summary shown directly under the title.
    // For other observations, 'genericDetails' is the primary detail for the collapsible section.
    const commandOutputForDetails = event.content || "";
    const genericDetails = event.content || event.message || "";

    if (event.observation === "run") {
      // Access .success using type assertion (event as any) only within this block
      const runEventSuccess = (event as any).success;
      const successState = runEventSuccess === true ? "success" : runEventSuccess === false ? "error" : "unknown";
      // Suffix for the title, e.g., " (success)" or " (failure)"
      const titleSuffix = runEventSuccess === true ? " (success)" : runEventSuccess === false ? " (failure)" : "";

      return (
        <GenericEventMessage
          title={
            <>
              <div>{`Command Result${titleSuffix}`}</div>
              {/* Display event.message as a non-collapsible summary if it exists */}
              {event.message && <div className="text-xs text-[var(--vscode-descriptionForeground)] mt-1 font-normal">{event.message}</div>}
            </>
          }
          details={commandOutputForDetails} // This is the full command output, e.g., ls result
          success={successState} // This will show the ✓ or ✗ icon
        />
      );
    }

    // Fallback for other generic observations (e.g., BROWSE, RECALL)
    // No success prop is passed as we don't assume 'success' exists on these types.
    return (
      <GenericEventMessage
        title={observationType}
        details={genericDetails}
      />
    );
  }

  // Fallback for unknown event types (StatusMessage or unknown)
  const eventType = isActionMessage(event) ? event.action :
                   isObservationMessage(event) ? event.observation :
                   isStatusMessage(event) ? "status" : "unknown"; // Use type guard
  // For basicContent, if it's a StatusMessage, we want event.message.
  // If it's none of the known types but has a 'message' property, use that.
  // Otherwise, empty string.
  const basicContent = isStatusMessage(event) ? event.message :
                      isObservationMessage(event) ? (event.content || event.message) :
                      isActionMessage(event) ? event.message :
                      ("message" in event && typeof (event as any).message === 'string') ? (event as any).message : "";
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
