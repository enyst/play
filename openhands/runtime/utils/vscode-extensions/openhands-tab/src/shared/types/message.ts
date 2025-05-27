export interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: number;
  type?: "message" | "error" | "status" | "action";
  imageUrls?: string[];
}

// Frontend-compatible types for socket messages
export interface ActionMessage {
  id: number;

  // Either 'agent' or 'user'
  source: "agent" | "user";

  // The action to be taken
  action: string;

  // The arguments for the action
  args: Record<string, unknown>;

  // A friendly message that can be put in the chat log
  message: string;

  // The timestamp of the message
  timestamp: string;

  // LLM metrics information
  llm_metrics?: {
    accumulated_cost: number;
    accumulated_token_usage: {
      prompt_tokens: number;
      completion_tokens: number;
      cache_read_tokens: number;
      cache_write_tokens: number;
      context_window: number;
      per_turn_token: number;
    };
  };

  // Tool call metadata
  tool_call_metadata?: {
    model_response?: {
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };
  };
}

export interface ObservationMessage {
  // The type of observation
  observation: string;

  id: number;
  cause: number;

  // The observed data
  content: string;

  extras: {
    metadata: Record<string, unknown>;
    error_id: string;
    [key: string]: string | Record<string, unknown>;
  };

  // A friendly message that can be put in the chat log
  message: string;

  // The timestamp of the message
  timestamp: string;
}

// Union type for all socket messages (matches frontend)
export type SocketMessage = ActionMessage | ObservationMessage | StatusMessage;

export interface StatusMessage {
  status_update: true;
  type: string;
  id?: string;
  message: string;
  conversation_title?: string;
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
    | "statusUpdate"
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
