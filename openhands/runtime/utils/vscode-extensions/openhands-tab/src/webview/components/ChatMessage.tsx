import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "../../shared/types";
import { cn, formatTimestamp } from "../../shared/utils";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const getMessageTypeClass = () => {
    switch (message.type) {
      case "error":
        return "message-error";
      case "status":
        return "message-status";
      default:
        return "";
    }
  };

  return (
    <article
      className={cn(
        "message",
        `message-${message.sender}`,
        getMessageTypeClass(),
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {isHovering && (
        <button
          className={cn("copy-button", isCopied && "copy-button-copied")}
          onClick={handleCopyToClipboard}
          title={isCopied ? "Copied!" : "Copy message"}
        >
          {isCopied ? "✓" : "📋"}
        </button>
      )}

      <div className="message-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code: ({ node, className, children, ...props }: any) => {
              const match = /language-(\w+)/.exec(className || "");
              const inline = !className;
              return !inline ? (
                <pre className="code-block">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              ) : (
                <code className="inline-code" {...props}>
                  {children}
                </code>
              );
            },
            p: ({ children }) => (
              <p className="message-paragraph">{children}</p>
            ),
            ul: ({ children }) => <ul className="message-list">{children}</ul>,
            ol: ({ children }) => (
              <ol className="message-list message-list-ordered">{children}</ol>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                className="message-link"
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

      <div className="message-timestamp">
        {formatTimestamp(message.timestamp)}
      </div>
    </article>
  );
}
