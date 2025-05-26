import React, { useState, useRef, KeyboardEvent } from "react";
import { cn } from "../../shared/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = "Type your message...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage);
      setMessage("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  return (
    <div className="border-t border-[var(--vscode-panel-border)] bg-[var(--vscode-panel-background)] p-3">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex-1 min-h-[36px] max-h-[120px] p-2 rounded",
            "border border-[var(--vscode-input-border)]",
            "bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)]",
            "placeholder:text-[var(--vscode-input-placeholderForeground)]",
            "focus:border-[var(--vscode-focusBorder)] focus:outline-none",
            "resize-none transition-colors",
            disabled && "opacity-60 cursor-not-allowed"
          )}
          rows={1}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !message.trim()}
          className={cn(
            "px-3 py-2 rounded flex items-center justify-center min-w-[36px] h-[36px]",
            "bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)]",
            "hover:bg-[var(--vscode-button-hoverBackground)] transition-colors",
            (disabled || !message.trim()) && "opacity-50 cursor-not-allowed hover:bg-[var(--vscode-button-background)]"
          )}
          title="Send message (Enter)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
      <div className="text-xs text-[var(--vscode-descriptionForeground)] mt-1 text-center">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}
