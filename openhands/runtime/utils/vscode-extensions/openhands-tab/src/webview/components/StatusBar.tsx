import React from "react";
import { cn } from "../../shared/utils";

interface StatusBarProps {
  isConnected: boolean;
  error: string | null;
  serverHealthy: boolean | null;
  onStartNewConversation: () => void;
  onCheckHealth: () => void;
}

export function StatusBar({
  isConnected,
  error,
  serverHealthy,
  onStartNewConversation,
  onCheckHealth,
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

        {error && (
          <div className="status-error">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
        )}
      </div>

      <div className="status-actions">
        <button
          onClick={onCheckHealth}
          className="new-conversation-button"
          title="Check server health"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          Health
        </button>
        <button
          onClick={onStartNewConversation}
          className="new-conversation-button"
          title="Start new conversation"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          New Chat
        </button>
      </div>
    </div>
  );
}
