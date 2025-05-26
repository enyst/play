import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "../../shared/types";
import { cn, formatTimestamp } from "../../shared/utils";
import { EventMessage } from "./EventMessage";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Handle action type messages with EventMessage component
  if (message.type === "action" && (message as any).eventData) {
    return <EventMessage event={(message as any).eventData} />;
  }

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const getMessageStyles = () => {
    const baseStyles = "relative max-w-[85%] p-3 rounded-lg break-words";
    
    switch (message.sender) {
      case "user":
        return cn(
          baseStyles,
          "self-end ml-auto",
          "bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)]"
        );
      case "assistant":
        switch (message.type) {
          case "error":
            return cn(
              baseStyles,
              "self-start mr-auto",
              "bg-[var(--vscode-inputValidation-errorBackground)]",
              "border border-[var(--vscode-inputValidation-errorBorder)]",
              "text-[var(--vscode-inputValidation-errorForeground)]"
            );
          case "status":
            return cn(
              baseStyles,
              "self-center max-w-full",
              "bg-[var(--vscode-editorInfo-background)]",
              "border border-[var(--vscode-editorInfo-border)]",
              "text-[var(--vscode-editorInfo-foreground)]",
              "text-xs italic"
            );
          default:
            return cn(
              baseStyles,
              "self-start mr-auto",
              "bg-[var(--vscode-editorWidget-background)]",
              "border border-[var(--vscode-editorWidget-border)]"
            );
        }
      default:
        return baseStyles;
    }
  };

  return (
    <article
      className={getMessageStyles()}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {isHovering && (
        <button
          className={cn(
            "absolute top-2 right-2 px-2 py-1 text-xs rounded transition-all",
            "bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)]",
            "hover:bg-[var(--vscode-button-hoverBackground)] opacity-80 hover:opacity-100",
            isCopied && "bg-[var(--vscode-charts-green)] text-white"
          )}
          onClick={handleCopyToClipboard}
          title={isCopied ? "Copied!" : "Copy message"}
        >
          {isCopied ? "✓" : "📋"}
        </button>
      )}

      <div className="mb-1">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code: ({ node, className, children, ...props }: any) => {
              const match = /language-(\w+)/.exec(className || "");
              const inline = !className;
              return !inline ? (
                <pre className="bg-[var(--vscode-textCodeBlock-background)] border border-[var(--vscode-editorWidget-border)] rounded p-3 my-2 overflow-x-auto font-mono text-xs">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              ) : (
                <code className="bg-[var(--vscode-textCodeBlock-background)] border border-[var(--vscode-editorWidget-border)] rounded px-1 py-0.5 font-mono text-xs" {...props}>
                  {children}
                </code>
              );
            },
            p: ({ children }) => (
              <p className="mb-2 last:mb-0">{children}</p>
            ),
            ul: ({ children }) => <ul className="my-2 pl-5 list-disc">{children}</ul>,
            ol: ({ children }) => (
              <ol className="my-2 pl-5 list-decimal">{children}</ol>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-[var(--vscode-textLink-foreground)] hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>

      <div className={cn(
        "text-xs text-[var(--vscode-descriptionForeground)] mt-1",
        message.sender === "user" ? "text-left" : "text-right"
      )}>
        {formatTimestamp(message.timestamp)}
      </div>
    </article>
  );
}
