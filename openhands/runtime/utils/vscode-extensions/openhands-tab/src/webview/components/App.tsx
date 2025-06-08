import React, { useState, useEffect } from "react";
import {
  Message,
  WebviewMessage,
  SocketMessage,
  StatusMessage,
  HealthCheckResult,
  // Assuming Conversation type might eventually be here or in a more specific import
} from "../../shared/types";
import { generateId } from "../../shared/utils";
import { ChatInterface } from "./ChatInterface";
import RecentConversationsList from './RecentConversationsList'; // Import new component
import { useVSCodeAPI } from "../hooks/useVSCodeAPI";
import { isObservationMessage, isActionMessage } from "../utils/typeGuards";

// Define Conversation type locally for now, ideally from shared/types
interface Conversation {
  id: string;
  title: string;
  lastUpdatedAt: string; // ISO string format
  snippet?: string;
}

export type View = 'chat' | 'recentConversations';

export function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // For chat loading
  const [error, setError] = useState<string | null>(null); // For general/chat errors
  const [serverHealthy, setServerHealthy] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // New state variables for recent conversations view
  const [currentView, setCurrentView] = useState<View>('recentConversations');
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [isLoadingRecentConversations, setIsLoadingRecentConversations] = useState<boolean>(false);
  const [recentConversationsError, setRecentConversationsError] = useState<string | null>(null);

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
        // New cases for recent conversations
        case "recentConversationsResponse":
          if (Array.isArray(message.data)) {
            setRecentConversations(message.data as Conversation[]);
          } else {
            console.warn("[Webview] recentConversationsResponse data is not an array:", message.data);
            setRecentConversations([]); // Set to empty array if data is invalid
          }
          setIsLoadingRecentConversations(false);
          setRecentConversationsError(null);
          break;
        case "recentConversationsError":
          setRecentConversationsError(message.error || "Failed to load recent conversations.");
          setIsLoadingRecentConversations(false);
          setRecentConversations([]);
          break;
        default:
          console.warn("[Webview] Unknown message type:", message.type);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []); // Empty dependency array, runs once

  // Effect to fetch recent conversations when view changes
  useEffect(() => {
    if (currentView === 'recentConversations') {
      console.log("[Webview] Current view is recentConversations, fetching list...");
      setIsLoadingRecentConversations(true);
      setRecentConversationsError(null);
      vscode.postMessage({ type: "getRecentConversations" });
    }
  }, [currentView, vscode]); // Add vscode to dependencies if its reference can change, though unlikely

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
    setMessages([]); // Clear existing messages for the new chat
    setError(null);
    setStatusMessage("Starting new conversation...");
    setIsLoading(true); // Indicate loading for the new chat session
    setCurrentView('chat'); // Switch to chat view
  };

  // Handler for selecting a conversation from the recent list
  const handleSelectConversation = (conversationId: string) => {
    console.log("[Webview] Selecting conversation:", conversationId);
    vscode.postMessage({
      type: "loadConversation",
      data: { conversationId },
    });
    setMessages([]); // Clear messages from previous conversation
    setError(null);
    setStatusMessage(`Loading conversation: ${conversationId.substring(0, 8)}...`);
    setIsLoading(true); // Indicate loading for the selected conversation
    setCurrentView('chat');
  };

  // Handler for the "Start New Conversation" button in the empty state of RecentConversationsList
  const handleStartNewConversationFromRecent = () => {
    console.log("[Webview] Starting new conversation from recent list empty state");
    handleStartNewConversation(); // Reuse existing logic
    // currentView is already set to 'chat' by handleStartNewConversation
  };

  // Handlers for top navigation buttons
  const handleNavigateToChat = () => {
    // If already in chat view and want a *new* session, call handleStartNewConversation
    // If simply switching to an existing chat session (not fully implemented here, as chat loads on select)
    // then just setCurrentView might be enough, but for "New Chat" button, starting fresh is good.
    handleStartNewConversation();
  };

  const handleNavigateToRecent = () => {
    setCurrentView('recentConversations');
    // The useEffect for currentView will trigger fetching recent conversations
  };

  // Main render structure
  return (
    <div className="flex flex-col h-screen bg-vscode-editor-background text-vscode-editor-foreground">
      {/* Navigation Header */}
      <div className="p-2 border-b border-vscode-editorWidget-border bg-vscode-sideBar-background flex justify-start space-x-2">
        <button
          onClick={handleNavigateToChat}
          disabled={currentView === 'chat' && isLoading} // Disable if in chat view and chat is loading
          className={`px-3 py-1 text-sm rounded focus:outline-none transition-colors
            ${currentView === 'chat' && !isLoading ? 'bg-vscode-button-background text-vscode-button-foreground hover:bg-vscode-button-hoverBackground'
                                  : 'bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground hover:bg-vscode-button-secondaryHoverBackground'}
            disabled:opacity-50`}
        >
          New Chat (+)
        </button>
        <button
          onClick={handleNavigateToRecent}
          disabled={currentView === 'recentConversations' && isLoadingRecentConversations}
          className={`px-3 py-1 text-sm rounded focus:outline-none transition-colors
            ${currentView === 'recentConversations' && !isLoadingRecentConversations ? 'bg-vscode-button-background text-vscode-button-foreground hover:bg-vscode-button-hoverBackground'
                                      : 'bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground hover:bg-vscode-button-secondaryHoverBackground'}
            disabled:opacity-50`}
        >
          Recent (🕒)
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-grow overflow-y-auto">
        {currentView === 'recentConversations' && (() => {
          if (isLoadingRecentConversations) {
            return <div className="p-4 text-center">Loading recent conversations...</div>;
          }
          if (recentConversationsError) {
            return (
              <div className="p-4 text-center text-red-400">
                <p>Error: {recentConversationsError}</p>
                <button
                  onClick={() => vscode.postMessage({ type: "getRecentConversations" })}
                  className="mt-2 bg-[var(--vscode-button-background)] hover:bg-[var(--vscode-button-hoverBackground)] text-[var(--vscode-button-foreground)] font-semibold py-1 px-3 rounded text-sm focus:outline-[var(--vscode-focusBorder)]"
                >
                  Retry
                </button>
              </div>
            );
          }
          return (
            <RecentConversationsList
              conversations={recentConversations}
              onSelectConversation={handleSelectConversation}
              onStartNewConversation={handleStartNewConversationFromRecent}
            />
          );
        })()}

        {currentView === 'chat' && (
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
        )}
      </div>
    </div>
  );

  // Original conditional rendering logic commented out for replacement with the above structure
  /*
  if (currentView === 'recentConversations') {
    if (isLoadingRecentConversations) {
      return <div className="p-4 text-center text-white">Loading recent conversations...</div>;
    }
    // ... (rest of the original conditional rendering, now part of the new structure) ...
  }
  */
}
