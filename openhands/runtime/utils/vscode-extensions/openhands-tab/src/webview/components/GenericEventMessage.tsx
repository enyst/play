import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../../shared/utils";

interface GenericEventMessageProps {
  title: React.ReactNode;
  details: string | React.ReactNode;
  success?: "success" | "error" | "unknown";
}

export function GenericEventMessage({
  title,
  details,
  success,
}: GenericEventMessageProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getSuccessIndicator = () => {
    if (!success) return null;
    
    switch (success) {
      case "success":
        return <span className="text-[var(--vscode-charts-green)] text-xs">✓</span>;
      case "error":
        return <span className="text-[var(--vscode-charts-red)] text-xs">✗</span>;
      case "unknown":
        return <span className="text-[var(--vscode-charts-yellow)] text-xs">?</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-2 border-l-2 border-neutral-400 pl-3 my-2 py-2 text-sm w-full">
      <div className="flex items-center justify-between font-medium text-[var(--vscode-editor-foreground)]">
        <div className="flex items-center gap-2">
          {title}
          {details && (
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="text-[var(--vscode-descriptionForeground)] hover:text-[var(--vscode-editor-foreground)] transition-colors"
              title={showDetails ? "Hide details" : "Show details"}
            >
              <svg 
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className={cn("transition-transform", showDetails && "rotate-180")}
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </button>
          )}
        </div>

        {getSuccessIndicator()}
      </div>

      {showDetails && details && (
        <div className="text-[var(--vscode-descriptionForeground)] text-xs">
          {typeof details === "string" ? (
            <ReactMarkdown
              components={{
                code: ({ node, className, children, ...props }: any) => {
                  const inline = !className;
                  return !inline ? (
                    <pre className="bg-[var(--vscode-textCodeBlock-background)] border border-[var(--vscode-editorWidget-border)] rounded p-2 my-1 overflow-x-auto font-mono text-xs">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  ) : (
                    <code className="bg-[var(--vscode-textCodeBlock-background)] border border-[var(--vscode-editorWidget-border)] rounded px-1 py-0.5 font-mono" {...props}>
                      {children}
                    </code>
                  );
                },
                p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="my-1 pl-4 list-disc">{children}</ul>,
                ol: ({ children }) => <ol className="my-1 pl-4 list-decimal">{children}</ol>,
              }}
              remarkPlugins={[remarkGfm]}
            >
              {details}
            </ReactMarkdown>
          ) : (
            details
          )}
        </div>
      )}
    </div>
  );
}