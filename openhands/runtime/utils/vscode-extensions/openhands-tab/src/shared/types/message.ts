export interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: number;
  type?: "message" | "error" | "status" | "action";
  imageUrls?: string[];
}

export interface AgentEvent {
  action?: string;
  args?: {
    content?: string;
    thought?: string;
    [key: string]: any;
  };
  observation?: string;
  content?: string;
  message?: string;
  error?: boolean;
  type?: string;
}

export interface HealthCheckResult {
  isHealthy: boolean;
  error?: string;
}

export interface WebviewMessage {
  type:
    | "userPrompt"
    | "startNewConversation"
    | "agentResponse"
    | "clearChat"
    | "status"
    | "error"
    | "checkHealth"
    | "healthCheck"
    | "openFile";
  data?: any;
  text?: string;
  message?: string;
}

export interface ConversationState {
  conversationId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}
