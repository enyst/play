import * as vscode from "vscode";
import * as fs from 'fs';
import * as path from 'path';
import { SocketService } from "./services/socket-service";
import { ConversationService } from "./services/conversation-service";
import { HealthService } from "./services/health-service";
import { WebviewMessage, AgentEvent, StatusMessage } from "../shared/types";

export class OpenHandsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "openhandsView";

  private view?: vscode.WebviewView;

  private socketService?: SocketService;

  private conversationService: ConversationService;

  private healthService: HealthService;

  private conversationId: string | null = null;

  private serverUrl: string;
  private healthCheckInterval?: NodeJS.Timeout;

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

    // Setup periodic health check
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.healthCheckInterval = setInterval(() => {
      if (this.view && this.view.visible) {
        console.log("[OpenHands Extension] Performing periodic health check (view visible).");
        this.performHealthCheck();
      } else {
        console.log("[OpenHands Extension] Skipping periodic health check (view not visible or disposed).");
      }
    }, 60000); // 60 seconds

    // Add disposal logic for the interval and other resources
    // This will be pushed to context.subscriptions to be managed by VS Code
    this.context.subscriptions.push(
      new vscode.Disposable(() => {
        if (this.healthCheckInterval) {
          clearInterval(this.healthCheckInterval);
          this.healthCheckInterval = undefined;
          console.log("[OpenHands Extension] Cleared health check interval on extension deactivation/dispose.");
        }
        if (this.socketService) {
          this.socketService.disconnect();
          this.socketService = undefined;
          console.log("[OpenHands Extension] Disconnected socket service on extension deactivation/dispose.");
        }
      })
    );

    // Handle webview-specific disposal (e.g., when the view itself is closed by the user)
    webviewView.onDidDispose(
      () => {
        console.log("[OpenHands Extension] Webview panel for OpenHandsViewProvider disposed.");
        if (this.healthCheckInterval) {
          clearInterval(this.healthCheckInterval);
          this.healthCheckInterval = undefined;
          console.log("[OpenHands Extension] Cleared health check interval due to webview disposal.");
        }
        if (this.socketService) {
          this.socketService.disconnect();
          this.socketService = undefined;
          console.log("[OpenHands Extension] Disconnected socket service due to webview disposal.");
        }
        this.view = undefined; // Clear the view reference
      },
      null, // Using null for `thisArgs`
      this.context.subscriptions // Add this disposable to the extension's subscriptions
    );
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
        case "openFile":
          if (message.data && message.data.path) {
            await this.handleOpenFileRequest(message.data.path);
          } else {
            console.warn("[OpenHands Extension] Received openFile request without a valid path.", message.data);
            vscode.window.showWarningMessage("Could not open item: Path not provided.");
          }
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
        // Check if this is a status update
        if ((event as any).status_update) {
          // Convert to StatusMessage format and send as statusUpdate
          const statusMessage: StatusMessage = {
            status_update: true,
            type: (event as any).type || "info",
            id: (event as any).id,
            message: event.message || event.content || "",
            conversation_title: (event as any).conversation_title,
          };
          this.postMessageToWebview({
            type: "statusUpdate",
            data: statusMessage,
          });
        } else {
          // Regular agent event
          this.postMessageToWebview({
            type: "agentResponse",
            data: event,
          });
        }
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


  private async handleOpenFileRequest(itemPath: string) {
    console.log(`[OpenHands Extension] Processing openFile request for: ${itemPath}`);
    try {
      const itemStat = await fs.promises.stat(itemPath); // Renamed 'stat' to 'itemStat', now async
      if (itemStat.isDirectory()) {
        console.log(`[OpenHands Extension] Path is a directory: ${itemPath}. Revealing in explorer.`);
        const dirUri = vscode.Uri.file(itemPath);
        // Ensure explorer is visible and then reveal
        await vscode.commands.executeCommand('workbench.view.explorer');
        await vscode.commands.executeCommand('revealInExplorer', dirUri);
        console.log(`[OpenHands Extension] Successfully revealed directory: ${itemPath}`);
      } else if (itemStat.isFile()) {
        console.log(`[OpenHands Extension] Path is a file: ${itemPath}. Opening in editor.`);
        const fileUri = vscode.Uri.file(itemPath);
        const document = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(document);
        console.log(`[OpenHands Extension] Successfully opened file: ${itemPath}`);
      } else {
        console.warn(`[OpenHands Extension] Path is neither a file nor a directory: ${itemPath}`);
        vscode.window.showWarningMessage(`Cannot open: ${itemPath} is not a file or directory.`);
      }
    } catch (error) {
      console.error(`[OpenHands Extension] Error processing path ${itemPath}:`, error);
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        vscode.window.showErrorMessage(`Path not found: ${itemPath}`);
      } else {
        vscode.window.showErrorMessage(`Failed to process path: ${itemPath}. ${error instanceof Error ? error.message : ""}`);
      }
    }
  }

  private postMessageToWebview(message: WebviewMessage) {
    if (this.view) {
      this.view.webview.postMessage(message);
    }
  }


  private _getNonce(): string {
    return getNonce(); // Calls the existing global function
  }

  private _getUri(webview: vscode.Webview, ...pathSegments: string[]): vscode.Uri {
    return webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, ...pathSegments),
    );
  }

  private _getCspDirectives(webview: vscode.Webview, nonce: string): string {
    const cspSource = webview.cspSource; // e.g., vscode-webview-resource:
    const serverHttpUrl = this.serverUrl.replace(/\/\/$/, ''); // Remove trailing slash
    const serverWsUrl = serverHttpUrl.replace(/^http/, 'ws'); // http -> ws, https -> wss

    // CSP Notes:
    // - connect-src is now dynamically set to the configured serverUrl and its WebSocket equivalent.
    // - style-src includes 'unsafe-inline'. This is kept for now to maintain existing behavior.
    //   It should be reviewed as a future hardening step.
    // - img-src allows loading images from extension resources and data URIs.
    return `default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src ${serverHttpUrl} ${serverWsUrl}; img-src ${cspSource} data:;`;
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    // Get values for template placeholders using helper methods
    const nonce = this._getNonce();
    const scriptUri = this._getUri(webview, "dist", "webview.iife.js");
    const styleCssUri = this._getUri(webview, "dist", "webview.css");
    const styleResetUri = this._getUri(webview, "media", "reset.css");
    const styleVSCodeUri = this._getUri(webview, "media", "vscode.css");
    const cspDirectives = this._getCspDirectives(webview, nonce);

    // Construct path to HTML template relative to extension root
    const templatePath = path.join(this.extensionUri.fsPath, 'src', 'extension', 'webview', 'template.html');
    
    let htmlContent: string;
    try {
      htmlContent = fs.readFileSync(templatePath, 'utf-8');
    } catch (error) {
      console.error('[OpenHands Extension] Error reading HTML template:', templatePath, error);
      // Return a minimal HTML body with the error to ensure the webview doesn't stay blank
      // Also, log the path that was attempted to aid debugging.
      return `<html><body><p style="color:var(--vscode-editor-foreground); padding:20px;">Error loading webview content. Failed to read template file at: ${templatePath}. Error: ${error instanceof Error ? error.message : String(error)}</p></body></html>`;
    }

    // Replace placeholders in the template
    // Using global regex replace for each placeholder
    htmlContent = htmlContent.replace(/{{CSP_DIRECTIVES}}/g, cspDirectives);
    htmlContent = htmlContent.replace(/{{NONCE}}/g, nonce);
    htmlContent = htmlContent.replace(/{{SCRIPT_URI}}/g, scriptUri.toString());
    htmlContent = htmlContent.replace(/{{STYLE_RESET_URI}}/g, styleResetUri.toString());
    htmlContent = htmlContent.replace(/{{STYLE_VSCODE_URI}}/g, styleVSCodeUri.toString());
    htmlContent = htmlContent.replace(/{{STYLE_CSS_URI}}/g, styleCssUri.toString());

    // For the logged URIs in the template
    htmlContent = htmlContent.replace(/{{SCRIPT_URI_LOG}}/g, scriptUri.toString());
    htmlContent = htmlContent.replace(/{{STYLE_CSS_URI_LOG}}/g, styleCssUri.toString());

    return htmlContent;
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
