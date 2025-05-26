import React from "react";
import { cn } from "../../shared/utils";

interface StatusBarProps {
  isConnected: boolean;
  error: string | null;
  serverHealthy: boolean | null;
  onStartNewConversation: () => void;
}

export function StatusBar({
  isConnected,
  error,
  serverHealthy,
  onStartNewConversation,
}: StatusBarProps) {
  return (
    <div className="status-bar">
      <div className="status-line-1" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <div className="status-info" style={{ display: "flex", alignItems: "center" }}>
          {/* Connection Status */}
          <div
            className={cn(
              "status-indicator",
              isConnected ? "status-connected" : "status-disconnected",
            )}
          >
            <div className="status-dot" />
            <span className="status-text">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          {/* Server Health Status */}
          <div
            className={cn(
              "status-indicator",
              serverHealthy === true ? "status-connected" :
              serverHealthy === false ? "status-disconnected" : "status-unknown"
            )}
            style={{ marginLeft: "10px" }} // Spacing between indicators
          >
            <div className="status-dot" />
            <span className="status-text">
              {serverHealthy === null ? "Checking..." :
               serverHealthy ? "Server OK" : "Server Down"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="status-actions">
          <button
            onClick={onStartNewConversation}
            className="new-conversation-button"
            title="New Conversation"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error Line */}
      {error && (
        <div 
          className="status-line-2 status-error-line" 
          style={{
            marginTop: "4px", 
            paddingTop: "4px", 
            borderTop: "1px solid var(--vscode-editorGroup-border)", 
            color: "var(--vscode-errorForeground)",
            fontSize: "0.9em", // Slightly smaller text for the error
            whiteSpace: "normal", // Allow error text to wrap
            wordBreak: "break-word" // Break long words if necessary
          }}
        >
          <span className="error-icon" style={{ marginRight: "4px" }}>⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}
    </div>
  );
}
