import { io, Socket } from "socket.io-client";
import { SocketMessage } from "../../shared/types"; // ActionMessage is not directly used here but good for context

// Define a type for the delegated action event from the backend
// This is based on the structure sent by the Python VsCodeRuntime
// Matches oh_event_payload in vscode_runtime.py
export interface DelegatedActionOhEvent {
  id: string; // Unique ID of this event, remembered by backend
  action: string; // Action type (e.g., CmdRunAction.action)
  args: Record<string, any>; // Action arguments (CmdRunAction.args)
  message?: string; // Optional: "Agent action delegated for VSCode execution."
  source?: string; // Optional: "agent"
  timestamp?: string; // Optional: "YYYY-MM-DDTHH:mm:ss.sssZ"
}

export interface SocketServiceConfig {
  serverUrl: string;
  conversationId: string;
  onWebviewEvent: (event: SocketMessage) => void; // For regular webview updates
  onRuntimeAction: (event: DelegatedActionOhEvent) => void; // For runtime actions
  onConnect: () => void;
  onDisconnect: (reason: string) => void;
  onError: (error: Error) => void;
}

export class SocketService {
  private _socket: Socket | null = null; // Renamed for public getter

  private config: SocketServiceConfig;

  private responseTimer: NodeJS.Timeout | null = null;

  private readonly RESPONSE_TIMEOUT_MS = 30000; // FIXME: this should be read from the main sandbox configuration

  constructor(config: SocketServiceConfig) {
    this.config = config;
  }

  // Public getter for the socket instance
  public get socket(): Socket | null {
    return this._socket;
  }

  connect(): void {
    if (
      this._socket?.connected &&
      this._socket.io.opts.query?.conversation_id === this.config.conversationId
    ) {
      console.log("[SocketService] Socket already connected for this conversation");
      return;
    }

    this.disconnect();

    console.log(
      `[SocketService] Connecting to ${this.config.serverUrl} for conversation ${this.config.conversationId}`,
    );

    this._socket = io(this.config.serverUrl, {
      query: {
        conversation_id: this.config.conversationId,
        latest_event_id: -1, // Standard for OpenHands
      },
      transports: ["websocket"],
      reconnectionAttempts: 3,
      timeout: 10000, // Standard connection timeout
      autoConnect: true,
    });

    this.setupEventListeners();
  }

  disconnect(): void {
    if (this._socket) {
      console.log("[SocketService] Disconnecting socket");
      this._socket.disconnect();
      this._socket.removeAllListeners(); // Clean up listeners
      this._socket = null;
    }
    this.clearResponseTimer(); // Clear any pending response timers
  }

  sendMessage(content: string, imageUrls: string[] = []): void {
    if (!this._socket?.connected) {
      this.config.onError(new Error("Socket not connected. Cannot send message."));
      return;
    }

    const payload = {
      action: "message", // This is a user message action
      args: {
        content,
        image_urls: imageUrls,
      },
      source: "user", // Explicitly set source for user messages
      // id and timestamp will be added by the backend upon receiving oh_user_action
    };

    this.clearResponseTimer(); // Clear previous timer
    this.startResponseTimer(); // Start new timer for this message

    console.log("[SocketService] Sending message (oh_user_action):", payload);
    this._socket.emit("oh_user_action", payload);
  }

  isConnected(): boolean {
    return this._socket?.connected ?? false;
  }

  private isDelegatedAction(data: any): data is DelegatedActionOhEvent {
    // Criteria for a delegated action based on VsCodeRuntime.md and vscode_runtime.py:
    // 1. It has an 'action' field (string).
    // 2. The 'action' is one of the executable types (not 'message', 'think', etc.).
    // 3. It has an 'id' field (string, for correlation).
    // 4. It has an 'args' field (object).
    // 5. The 'source' is 'agent' (actions are delegated by the agent).
    const executableActions = ["run", "read", "write", "mkdir", "rmdir", "rm", "run_ipython", "browse"]; // Added browse
    return (
      data &&
      typeof data.action === 'string' &&
      executableActions.includes(data.action) &&
      typeof data.id === 'string' &&
      typeof data.args === 'object' &&
      data.args !== null && // Ensure args is not null
      data.source === 'agent'
    );
  }

  private setupEventListeners(): void {
    if (!this._socket) return;

    this._socket.on("connect", () => {
      console.log("[SocketService] Socket connected successfully");
      this.config.onConnect();
    });

    this._socket.on("oh_event", (data: SocketMessage | DelegatedActionOhEvent) => {
      console.log("[SocketService] Received oh_event:", JSON.stringify(data, null, 2));
      this.clearResponseTimer(); // Clear timer as we received an event

      if (this.isDelegatedAction(data)) {
        console.log("[SocketService] Identified as DelegatedActionOhEvent, routing to onRuntimeAction.");
        this.config.onRuntimeAction(data as DelegatedActionOhEvent);
      } else {
        // This is a regular event for the webview (e.g., agent 'think', 'message',
        // or an observation that the backend is forwarding).
        console.log("[SocketService] Identified as SocketMessage, routing to onWebviewEvent.");
        this.config.onWebviewEvent(data as SocketMessage);
      }
    });

    this._socket.on("disconnect", (reason: string) => {
      console.log("[SocketService] Socket disconnected:", reason);
      this.config.onDisconnect(reason);
    });

    this._socket.on("error", (error: Error) => {
      console.error("[SocketService] Socket error:", error);
      this.config.onError(error);
    });

    this._socket.on("connect_error", (error: Error) => {
      console.error("[SocketService] Socket connection error:", error);
      // Provide a more user-friendly message for connection errors
      this.config.onError(new Error(`Failed to connect to OpenHands server: ${error.message}. Please ensure the server is running at ${this.config.serverUrl} and accessible.`));
    });
  }

  private startResponseTimer(): void {
    // This timer is for user-initiated messages waiting for any agent activity.
    // Delegated actions will have their own timeout handling in the Python VsCodeRuntime.
    this.responseTimer = setTimeout(() => {
      console.warn("[SocketService] Agent response timeout after user message");
      this.config.onError(
        new Error(
          "Agent not responding after your message. Please check the server or try again.",
        ),
      );
      this.responseTimer = null;
    }, this.RESPONSE_TIMEOUT_MS);
  }

  private clearResponseTimer(): void {
    if (this.responseTimer) {
      clearTimeout(this.responseTimer);
      this.responseTimer = null;
    }
  }
}
