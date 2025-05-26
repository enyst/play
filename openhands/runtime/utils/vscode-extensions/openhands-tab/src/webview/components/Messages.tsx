import React from "react";
import { Message } from "../../shared/types";
import { ChatMessage } from "./ChatMessage";

interface MessagesProps {
  messages: Message[];
}

export function Messages({ messages }: MessagesProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center">
        <div className="space-y-2">
          <h3 className="text-base font-medium text-[var(--vscode-editor-foreground)]">
            Welcome to OpenHands
          </h3>
          <p className="text-sm text-[var(--vscode-descriptionForeground)]">
            Start a conversation to begin working with your AI assistant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </div>
  );
}
