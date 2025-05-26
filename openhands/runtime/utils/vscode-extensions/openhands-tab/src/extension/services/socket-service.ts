import { io, Socket } from "socket.io-client";
import { AgentEvent } from "../../shared/types";

export interface SocketServiceConfig {
  serverUrl: string;
  conversationId: string;
  onEvent: (event: AgentEvent) => void;
  onConnect: () => void;
  onDisconnect: (reason: string) => void;
  onError: (error: Error) => void;
}

export class SocketService {
  private socket: Socket | null = null;

  private config: SocketServiceConfig;

  private responseTimer: NodeJS.Timeout | null = null;

  private readonly RESPONSE_TIMEOUT_MS = 30000; // 30 seconds

  constructor(config: SocketServiceConfig) {
    this.config = config;
  }

  connect(): void {
    if (
      this.socket?.connected &&
      this.socket.io.opts.query?.conversation_id === this.config.conversationId
    ) {
      console.log("Socket already connected for this conversation");
      return;
    }

    this.disconnect();

    console.log(
      `Connecting to ${this.config.serverUrl} for conversation ${this.config.conversationId}`,
    );

    this.socket = io(this.config.serverUrl, {
      query: {
        conversation_id: this.config.conversationId,
        latest_event_id: -1,
      },
      transports: ["websocket"],
      reconnectionAttempts: 3,
      timeout: 10000,
      autoConnect: true,
    });

    this.setupEventListeners();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
    }
    this.clearResponseTimer();
  }

  sendMessage(content: string, imageUrls: string[] = []): void {
    if (!this.socket?.connected) {
      this.config.onError(new Error("Socket not connected"));
      return;
    }

    const payload = {
      action: "message",
      args: {
        content,
        image_urls: imageUrls,
      },
    };

    this.clearResponseTimer();
    this.startResponseTimer();

    console.log("Sending message:", payload);
    this.socket.emit("oh_user_action", payload);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Socket connected successfully");
      this.config.onConnect();
    });

    this.socket.on("oh_event", (data: AgentEvent) => {
      console.log("Received oh_event:", JSON.stringify(data, null, 2));
      this.clearResponseTimer();
      this.config.onEvent(data);
    });

    this.socket.on("disconnect", (reason: string) => {
      console.log("Socket disconnected:", reason);
      this.config.onDisconnect(reason);
    });

    this.socket.on("error", (error: Error) => {
      console.error("Socket error:", error);
      this.config.onError(error);
    });

    this.socket.on("connect_error", (error: Error) => {
      console.error("Socket connection error:", error);
      this.config.onError(new Error(`Connection failed: ${error.message}`));
    });
  }

  private startResponseTimer(): void {
    this.responseTimer = setTimeout(() => {
      console.warn("Agent response timeout");
      this.config.onError(
        new Error(
          "Agent not responding. Please check the server or try again.",
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
