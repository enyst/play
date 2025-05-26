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
      <div className="status-info">
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

        <div
          className={cn(
            "status-indicator",
            serverHealthy === true ? "status-connected" :
            serverHealthy === false ? "status-disconnected" : "status-unknown",
          )}
        >
          <div className="status-dot" />
          <span className="status-text">
            {serverHealthy === null ? "Checking..." :
             serverHealthy ? "Server OK" : "Server Down"}
          </span>
        </div>

        {error && isConnected && (serverHealthy === true || serverHealthy === null) && (
          <div className="status-error">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
        )}
      </div>

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
  );
}
