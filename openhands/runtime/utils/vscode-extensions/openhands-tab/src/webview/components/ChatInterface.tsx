import React, { useRef, useEffect } from "react";
import { Message } from "../../shared/types";
import { ChatInput } from "./ChatInput";
import { Messages } from "./Messages";
import { StatusBar } from "./StatusBar";

interface ChatInterfaceProps {
  messages: Message[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  serverHealthy: boolean | null;
  onSendMessage: (message: string) => void;
  onStartNewConversation: () => void;
  onCheckHealth: () => void;
}

export function ChatInterface({
  messages,
  isConnected,
  isLoading,
  error,
  serverHealthy,
  onSendMessage,
  onStartNewConversation,
  onCheckHealth,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="chat-interface">
      <div className="messages-container">
        <Messages messages={messages} />
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        onSendMessage={onSendMessage}
        disabled={isLoading}
        placeholder={
          isLoading
            ? "Agent is processing..."
            : isConnected
              ? "Type your message..."
              : "Start a conversation to begin..."
        }
      />

      <StatusBar
        isConnected={isConnected}
        error={error}
        serverHealthy={serverHealthy}
        onStartNewConversation={onStartNewConversation}
        onCheckHealth={onCheckHealth}
      />
    </div>
  );
}
