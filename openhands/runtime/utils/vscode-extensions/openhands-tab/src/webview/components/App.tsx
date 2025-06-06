import React, { useState, useEffect } from "react";
import {
  Message,
  WebviewMessage,
  SocketMessage,
  StatusMessage,
  HealthCheckResult,
} from "../../shared/types";
import { generateId } from "../../shared/utils";
import { ChatInterface } from "./ChatInterface";
import { useVSCodeAPI } from "../hooks/useVSCodeAPI";
import { isObservationMessage, isActionMessage } from "../utils/typeGuards";

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
    console.log(
      "[Webview] VSCode API available:",
      typeof window.acquireVsCodeApi !== "undefined",
    );
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
        default:
          console.warn("[Webview] Unknown message type:", message.type);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleAgentResponse = (event: SocketMessage) => {
    console.log("[Webview] Processing agent event:", event);

    // TODO: clean up this weird hack, remove the echo
    // Check if this is an echo of the last user message
    if (isActionMessage(event) && event.action === "message") {
      const lastUserMessage = messages.filter((m) => m.sender === "user").pop();
      if (lastUserMessage) {
        const userLastContent = lastUserMessage.content;

        const agentThought = event.args?.thought;
        // Determine what EventMessage.tsx would display as primary content if not a thought.
        // For AssistantMessageAction, args.content is not standard, so we primarily check event.message.
        const agentEffectiveMessage = event.message || ""; // Fallback to empty string if event.message is undefined

        // Scenario 1: Agent's "thought" is an echo.
        // EventMessage.tsx prioritizes displaying the thought.
        if (
          typeof agentThought === "string" &&
          agentThought.trim() === userLastContent.trim()
        ) {
          // If the thought is an echo, we should suppress it,
          // especially if the alternative (agentEffectiveMessage) is also an echo or empty.
          if (
            agentEffectiveMessage.trim() === userLastContent.trim() ||
            agentEffectiveMessage.trim() === ""
          ) {
            console.log(
              "[Webview] Suppressing echo message from agent (thought was an echo):",
              event,
            );
            return; // Don't display this echo
          }
        }

        // Scenario 2: Agent's "effective message" (event.message) is an echo, AND there's no overriding (non-echoing) thought.
        if (
          (!agentThought ||
            (typeof agentThought === "string" && agentThought.trim() === "")) &&
          typeof agentEffectiveMessage === "string" &&
          agentEffectiveMessage.trim() === userLastContent.trim()
        ) {
          console.log(
            "[Webview] Suppressing echo message from agent (effective message was an echo, no significant thought):",
            event,
          );
          return; // Don't display this echo
        }
      }
    }

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

    // Handle AgentStateChangeObservation to update status message
    if (
      isObservationMessage(event) &&
      event.observation === "agent_state_changed" &&
      event.extras &&
      typeof event.extras.agent_state === "string"
    ) {
      console.log("[Webview] Agent state changed:", event.extras.agent_state);
      setStatusMessage(`Agent: ${event.extras.agent_state}`);
      return; // Do not add to chat messages
    }

    addMessage(eventMessage);

    // Handle errors at the app level for the error state
    // Check for ErrorObservation (observation type "error")
    if (isObservationMessage(event) && event.observation === "error") {
      const errorMessage = event.content || event.message || "Agent error";
      setError(errorMessage);
    }

    // Check for observations with error_id (indicates an error occurred)
    if (
      isObservationMessage(event) &&
      typeof event.extras?.error_id === "string" &&
      event.extras.error_id
    ) {
      const errorMessage =
        event.content || event.message || "Agent encountered an error";
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
      if (
        error &&
        error.includes("Server") &&
        error.includes("not available")
      ) {
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
