import React from "react";
import { Message } from "../../shared/types";
import { ChatMessage } from "./ChatMessage";

interface MessagesProps {
  messages: Message[];
}

export function Messages({ messages }: MessagesProps) {
  if (messages.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-content">
          <h3>Welcome to OpenHands</h3>
          <p>Start a conversation to begin working with your AI assistant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </div>
  );
}
