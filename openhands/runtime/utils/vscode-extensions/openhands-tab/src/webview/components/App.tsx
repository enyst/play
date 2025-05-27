import React, { useState, useEffect } from "react";
import { Message, WebviewMessage, AgentEvent, StatusMessage, HealthCheckResult } from "../../shared/types";
import { generateId } from "../../shared/utils";
import { ChatInterface } from "./ChatInterface";
import { useVSCodeAPI } from "../hooks/useVSCodeAPI";

export function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverHealthy, setServerHealthy] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const vscode = useVSCodeAPI();

  useEffect(() => {
    // Test VSCode API availability
    console.log("[Webview] VSCode API available:", typeof window.acquireVsCodeApi !== 'undefined');
    console.log("[Webview] Window object keys:", Object.keys(window));

    // Listen for messages from the extension
    const handleMessage = (event: MessageEvent<WebviewMessage>) => {
      console.log("[Webview] Received message from extension:", event.data);
      const message = event.data;

      switch (message.type) {
        case "agentResponse":
          handleAgentResponse(message.data);
          setIsLoading(false);
          break;
        case "statusUpdate":
          handleStatusUpdate(message.data);
          break;
        case "status":
          if (message.message?.includes("connected")) {
            setIsConnected(true);
            setError(null);
          } else if (message.message?.includes("disconnected")) {
            setIsConnected(false);
          }
          // Add status message to chat
          if (message.message) {
            addStatusMessage(message.message);
          }
          break;
        case "error":
          setError(message.message || "Unknown error");
          setIsLoading(false);
          break;
        case "clearChat":
          setMessages([]);
          setIsConnected(false);
          setError(null);
          setIsLoading(false);
          setStatusMessage(null);
          break;
        case "healthCheck":
          handleHealthCheck(message.data);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleAgentResponse = (event: AgentEvent) => {
    console.log("[Webview] Processing agent event:", event);
    
    // For regular events, create a message that contains the raw event data
    // The EventMessage component will handle the proper rendering
    const eventMessage: Message = {
      id: generateId(),
      content: JSON.stringify(event), // Store the raw event for EventMessage to process
      sender: "assistant",
      timestamp: Date.now(),
      type: "action", // Mark as action type so we can handle it differently
    };
    
    // Add the event data to the message for EventMessage component
    (eventMessage as any).eventData = event;
    
    addMessage(eventMessage);
    
    // Still handle errors at the app level for the error state
    if (event.error) {
      const errorMessage = event.content || event.message || "Agent error";
      setError(errorMessage);
    }
  };

  const handleStatusUpdate = (statusMsg: StatusMessage) => {
    console.log("[Webview] Handling status update:", statusMsg);
    setStatusMessage(statusMsg.message || null);
  };

  const handleHealthCheck = (healthResult: HealthCheckResult) => {
    console.log("[Webview] Received health check result:", healthResult);
    setServerHealthy(healthResult.isHealthy);

    if (!healthResult.isHealthy) {
      setError(healthResult.error || "Server is not available");
    } else {
      // Clear error if server becomes healthy
      if (error && error.includes("Server") && error.includes("not available")) {
        setError(null);
      }
    }
  };

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const addStatusMessage = (content: string) => {
    addMessage({
      id: generateId(),
      content,
      sender: "assistant",
      timestamp: Date.now(),
      type: "status",
    });
  };

  const addErrorMessage = (content: string) => {
    addMessage({
      id: generateId(),
      content,
      sender: "assistant",
      timestamp: Date.now(),
      type: "error",
    });
  };

  const handleSendMessage = (content: string) => {
    // Add user message to chat
    addMessage({
      id: generateId(),
      content,
      sender: "user",
      timestamp: Date.now(),
      type: "message",
    });

    // Send to extension
    vscode.postMessage({
      type: "userPrompt",
      text: content,
    });

    setIsLoading(true);
    setError(null);
  };

  const handleStartNewConversation = () => {
    vscode.postMessage({
      type: "startNewConversation",
    });
  };

  return (
    <ChatInterface
      messages={messages}
      isConnected={isConnected}
      isLoading={isLoading}
      error={error}
      serverHealthy={serverHealthy}
      statusMessage={statusMessage}
      onSendMessage={handleSendMessage}
      onStartNewConversation={handleStartNewConversation}
    />
  );
}
