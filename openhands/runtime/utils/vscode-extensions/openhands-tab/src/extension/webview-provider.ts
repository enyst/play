import * as vscode from "vscode";
import { SocketService } from "./services/socket-service";
import { ConversationService } from "./services/conversation-service";
import { HealthService } from "./services/health-service";
import { WebviewMessage, AgentEvent } from "../shared/types";

export class OpenHandsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "openhandsView";

  private view?: vscode.WebviewView;

  private socketService?: SocketService;

  private conversationService: ConversationService;

  private healthService: HealthService;

  private conversationId: string | null = null;

  private serverUrl: string;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly context: vscode.ExtensionContext,
  ) {
    try {
      console.log("[OpenHands Extension] WebviewProvider constructor called");
      // Get server URL from settings
      const config = vscode.workspace.getConfiguration("openhands");
      this.serverUrl = config.get("serverUrl") || "http://localhost:3000";
      console.log("[OpenHands Extension] Server URL:", this.serverUrl);
      this.conversationService = new ConversationService(this.serverUrl);
      this.healthService = new HealthService(this.serverUrl);
      console.log("[OpenHands Extension] WebviewProvider constructor completed");
    } catch (error) {
      console.error("[OpenHands Extension] Error in WebviewProvider constructor:", error);
      throw error;
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    console.log("[OpenHands Extension] resolveWebviewView called");
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      (message: WebviewMessage) => {
        console.log("[OpenHands Extension] Raw message received:", JSON.stringify(message));
        this.handleWebviewMessage(message);
      },
      undefined,
      this.context.subscriptions,
    );

    // Perform initial health check
    this.performHealthCheck();
  }

  private async handleWebviewMessage(message: WebviewMessage) {
    if (!this.view) {
      console.log("[OpenHands Extension] No view available for message:", message.type);
      return;
    }

    console.log("[OpenHands Extension] Received webview message:", message.type, message);

    try {
      switch (message.type) {
        case "userPrompt":
          if (message.text) {
            await this.handleUserPrompt(message.text);
          }
          break;
        case "startNewConversation":
          await this.startNewConversation();
          break;
        case "checkHealth":
          console.log("[OpenHands Extension] Processing health check request");
          await this.performHealthCheck();
          break;
        default:
          console.log("[OpenHands Extension] Unknown message type:", message.type);
      }
    } catch (error) {
      console.error("[OpenHands Extension] Error handling message:", error);
      this.postMessageToWebview({
        type: "error",
        message: `Error handling message: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  private async handleUserPrompt(text: string) {
    try {
      // If no conversation exists, create one
      if (!this.conversationId) {
        await this.createConversation();
      }

      // If socket service doesn't exist or conversation changed, create/update it
      if (!this.socketService || !this.socketService.isConnected()) {
        this.createSocketService();
        this.socketService!.connect();
      }

      // Send the message
      this.socketService!.sendMessage(text);
    } catch (error) {
      if (error instanceof Error && error.message === "SETTINGS_NOT_FOUND_ERROR") {
        this.postMessageToWebview({
          type: "status", // Change type to "status"
          message: "LLM settings not found. Please configure your LLM API key and model in the OpenHands settings.",
        });
      } else {
        this.postMessageToWebview({
          type: "error",
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }
  }

  private async startNewConversation() {
    // Disconnect existing socket
    if (this.socketService) {
      this.socketService.disconnect();
      this.socketService = undefined;
    }

    this.conversationId = null;

    // Clear chat in webview
    this.postMessageToWebview({ type: "clearChat" });
  }

  private async createConversation() {
    try {
      this.conversationId = await this.conversationService.createConversation();
      console.log("Created conversation:", this.conversationId);
    } catch (error) {
      if (error instanceof Error && error.message === "SETTINGS_NOT_FOUND_ERROR") {
        throw error; // Re-throw the specific error marker
      }
      throw new Error(
        `Failed to create conversation: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private createSocketService() {
    if (!this.conversationId) {
      throw new Error("Cannot create socket service without conversation ID");
    }

    this.socketService = new SocketService({
      serverUrl: this.serverUrl,
      conversationId: this.conversationId,
      onEvent: (event: AgentEvent) => {
        this.postMessageToWebview({
          type: "agentResponse",
          data: event,
        });
      },
      onConnect: () => {
        this.postMessageToWebview({
          type: "status",
          message: "Agent connected",
        });
      },
      onDisconnect: (reason: string) => {
        this.postMessageToWebview({
          type: "status",
          message: `Agent disconnected: ${reason}`,
        });
      },
      onError: (error: Error) => {
        this.postMessageToWebview({
          type: "error",
          message: error.message,
        });
      },
    });
  }

  private async performHealthCheck() {
    try {
      console.log("[OpenHands Extension] Starting health check...");
      const healthResult = await this.healthService.checkHealth();
      console.log("[OpenHands Extension] Health check result:", healthResult);

      this.postMessageToWebview({
        type: "healthCheck",
        data: healthResult,
      });
    } catch (error) {
      console.error("[OpenHands Extension] Health check error:", error);
      this.postMessageToWebview({
        type: "healthCheck",
        data: {
          isHealthy: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  private postMessageToWebview(message: WebviewMessage) {
    if (this.view) {
      this.view.webview.postMessage(message);
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "dist", "webview.iife.js"),
    );

    // Get the CSS file generated by Vite
    const styleCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "dist", "webview.css"),
    );

    // Do the same for the stylesheet.
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "reset.css"),
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "vscode.css"),
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src http://localhost:* https://localhost:*;">
        <link href="${styleResetUri}" rel="stylesheet">
        <link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleCssUri}" rel="stylesheet">
        <title>OpenHands</title>
      </head>
      <body>
        <div id="root">
          <div style="padding: 20px; text-align: center; color: var(--vscode-editor-foreground);">
            Loading OpenHands...
          </div>
        </div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
        <script nonce="${nonce}">
          console.log('OpenHands webview HTML loaded');
          console.log('Script URI:', '${scriptUri}');
          console.log('CSS URI:', '${styleCssUri}');
        </script>
      </body>
      </html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
