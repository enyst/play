import * as http from "http";
import * as https from "https";
import { URL } from "url";

// Shared types (ideally in a shared file like src/shared/types/index.ts)
export interface Conversation {
  id: string;
  title: string;
  lastUpdatedAt: string;
  snippet?: string;
}

// Raw structure from the backend /api/conversations/recent
interface BackendConversationInfo {
  conversation_id: string;
  title: string;
  last_updated_at: string;
  created_at: string;
  // other fields from openhands.server.data_models.conversation_info.ConversationInfo
  // For example: status, trigger, selected_repository, selected_branch, git_provider
}

interface ConversationInfoResultSet {
  results: BackendConversationInfo[];
  next_page_id: string | null;
}

// Existing type from the file
export interface CreateConversationResponse {
  conversation_id: string;
}

export class ConversationService {
  private serverUrl: string;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
    if (!this.serverUrl) {
      // Fallback or configuration error
      console.warn("[ConversationService] Server URL is not configured. Using default http://localhost:3000.");
      this.serverUrl = "http://localhost:3000"; // Default if not provided
    }
  }

  async fetchRecentConversations(): Promise<Conversation[]> {
    return new Promise((resolve, reject) => {
      const url = new URL("/api/conversations/recent", this.serverUrl);
      const httpModule = url.protocol === "https:" ? https : http;
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search, // Ensure query params if any are included
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      };

      const req = httpModule.request(options, (res) => {
        let responseBody = "";
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          if (res.statusCode === 200) {
            try {
              const data: ConversationInfoResultSet = JSON.parse(responseBody);
              resolve(
                data.results.map((conv) => ({
                  id: conv.conversation_id,
                  title: conv.title || `Conversation ${conv.conversation_id.substring(0, 8)}`,
                  lastUpdatedAt: conv.last_updated_at,
                  snippet: conv.title ? conv.title.substring(0, 100) + (conv.title.length > 100 ? "..." : "") : "No details available.",
                })),
              );
            } catch (error) {
              console.error("[ConversationService] Error parsing recent conversations response:", error);
              reject(new Error("Failed to parse recent conversations response."));
            }
          } else {
            console.error(`[ConversationService] API Error ${res.statusCode} fetching recent: ${responseBody}`);
            reject(new Error(`Failed to fetch recent conversations: ${res.statusCode} ${res.statusMessage}`));
          }
        });
      });

      req.on("error", (error) => {
        console.error("[ConversationService] Network error fetching recent conversations:", error);
        reject(new Error(`Network error: ${error.message}`));
      });
      req.end();
    });
  }

  async fetchConversationDetails(conversationId: string): Promise<any> {
    // Placeholder: In a real scenario, this might fetch metadata or trigger a session resume.
    // For now, it doesn't fetch full chat history for replay.
    console.warn(`[ConversationService] fetchConversationDetails for ${conversationId} is a placeholder.`);
    // Example: Fetching metadata (ConversationInfo)
    // return new Promise((resolve, reject) => {
    //   const url = new URL(`/api/conversations/${conversationId}`, this.serverUrl);
    //   const httpModule = url.protocol === "https:" ? https : http;
    //   const options = { /* ... GET options ... */ };
    //   // ... httpModule.request logic ...
    // });
    return Promise.resolve({
      id: conversationId,
      message: `Details for conversation ${conversationId} would be fetched or session resumed here.`,
    });
  }

  // Existing createConversation method - renamed ConversationResponse to CreateConversationResponse for clarity
  async createConversation(initialMessage: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL("/api/conversations", this.serverUrl);
      const postData = JSON.stringify({ initial_user_msg: initialMessage });

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      };

      const httpModule = url.protocol === "https:" ? https : http;

      const req = httpModule.request(options, (res) => {
        let responseBody = "";

        res.on("data", (chunk) => {
          responseBody += chunk;
        });

        res.on("end", () => {
          console.log("[ConversationService] Full HTTP response body (createConversation):", responseBody);
          if (res.statusCode === 200) {
            try {
              const data: CreateConversationResponse = JSON.parse(responseBody); // Use new name
              if (data.conversation_id) {
                console.log("[ConversationService] Created conversation:", data.conversation_id);
                resolve(data.conversation_id);
              } else {
                reject(
                  new Error("Invalid API response: conversation_id missing"),
                );
              }
            } catch (error) {
              reject(
                new Error(
                  `Failed to parse server response: ${error instanceof Error ? error.message : String(error)}`,
                ),
              );
            }
          } else {
            if (res.statusCode === 400) {
              try {
                const parsedBody = JSON.parse(responseBody);
                if (
                  parsedBody &&
                  parsedBody.msg_id === "CONFIGURATION$SETTINGS_NOT_FOUND"
                ) {
                  reject(new Error("SETTINGS_NOT_FOUND_ERROR")); // Specific marker
                  return;
                }
              } catch (e) {
                // Not a JSON response or doesn't match our specific error, fall through to generic
              }
            }
            reject(
              new Error(`Server error (${res.statusCode}): ${responseBody}`),
            );
          }
        });
      });

      req.on("error", (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }
}
