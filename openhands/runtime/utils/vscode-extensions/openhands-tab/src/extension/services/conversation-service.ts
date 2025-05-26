import * as http from "http";
import * as https from "https";
import { URL } from "url";

export interface ConversationResponse {
  conversation_id: string;
}

export class ConversationService {
  private serverUrl: string;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  async createConversation(): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL("/api/conversations", this.serverUrl);
      const postData = JSON.stringify({});

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
          console.log("Full HTTP response body:", responseBody);
          if (res.statusCode === 200) {
            try {
              const data: ConversationResponse = JSON.parse(responseBody);
              if (data.conversation_id) {
                console.log("Created conversation:", data.conversation_id);
                resolve(data.conversation_id);
              } else {
                reject(
                  new Error("Invalid API response: conversation_id missing"),
                );
              }
            } catch (error) {
              reject(new Error(`Failed to parse server response: ${error}`));
            }
          } else {
            if (res.statusCode === 400) {
              try {
                const parsedBody = JSON.parse(responseBody);
                if (parsedBody && parsedBody.msg_id === "CONFIGURATION$SETTINGS_NOT_FOUND") {
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
