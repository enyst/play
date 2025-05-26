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
  const getStatusDotColor = (status: boolean | null) => {
    if (status === true) return "bg-[var(--vscode-charts-green)]";
    if (status === false) return "bg-[var(--vscode-charts-red)]";
    return "bg-[var(--vscode-charts-yellow)]";
  };

  return (
    <div className="border-t border-[var(--vscode-panel-border)] bg-[var(--vscode-panel-background)] p-2 min-h-[40px]">
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-1.5 text-xs">
            <div className={cn("w-2 h-2 rounded-full", getStatusDotColor(isConnected))} />
            <span>{isConnected ? "Connected" : "Disconnected"}</span>
          </div>

          {/* Server Health Status */}
          <div className="flex items-center gap-1.5 text-xs">
            <div className={cn("w-2 h-2 rounded-full", getStatusDotColor(serverHealthy))} />
            <span>
              {serverHealthy === null ? "Checking..." :
               serverHealthy ? "Server OK" : "Server Down"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onStartNewConversation}
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-xs rounded",
              "bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)]",
              "hover:bg-[var(--vscode-button-hoverBackground)] transition-colors"
            )}
            title="New Conversation"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            New
          </button>
        </div>
      </div>

      {/* Error Line - only show when connected and server is healthy or checking */}
      {error && isConnected && serverHealthy !== false && (
        <div className="mt-1 pt-1 border-t border-[var(--vscode-editorGroup-border)] text-[var(--vscode-errorForeground)] text-xs break-words">
          <span className="mr-1">⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
