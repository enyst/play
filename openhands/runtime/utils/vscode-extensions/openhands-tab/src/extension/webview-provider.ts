import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { SocketService, DelegatedActionOhEvent } from "./services/socket-service.js";
import { ConversationService } from "./services/conversation-service.js";
import { HealthService } from "./services/health-service.js";
import { WebviewMessage, SocketMessage } from "../shared/types";
import { VsCodeRuntimeActionHandler } from "./services/vscodeRuntimeActionHandler.js";

export class OpenHandsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "openhandsView";

  private view?: vscode.WebviewView;

  private socketService?: SocketService;
  private vscodeRuntimeActionHandler?: VsCodeRuntimeActionHandler;

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
      const config = vscode.workspace.getConfiguration("openhands");
      this.serverUrl = config.get("serverUrl") || "http://localhost:3000";
      console.log("[OpenHands Extension] Server URL:", this.serverUrl);
      this.conversationService = new ConversationService(this.serverUrl);
      this.healthService = new HealthService(this.serverUrl);
      console.log(
        "[OpenHands Extension] WebviewProvider constructor completed",
      );
    } catch (error) {
      console.error(
        "[OpenHands Extension] Error in WebviewProvider constructor:",
        error,
      );
      throw error;
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _resolveContext: vscode.WebviewViewResolveContext,
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
        console.log(
          "[OpenHands Extension] Raw message received from webview:",
          JSON.stringify(message),
        );
        this.handleWebviewMessage(message);
      },
      undefined,
      this.context.subscriptions,
    );

    this.performHealthCheck();

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.healthCheckInterval = setInterval(() => {
      if (this.view && this.view.visible) {
        this.performHealthCheck();
      } else {
        console.log(
          "[OpenHands Extension] Skipping periodic health check (view not visible or disposed).",
        );
      }
    }, 60000);

    this.context.subscriptions.push(
      new vscode.Disposable(() => {
        console.log("[OpenHands Extension] Global deactivation triggered.");
        if (this.healthCheckInterval) {
          clearInterval(this.healthCheckInterval);
          this.healthCheckInterval = undefined;
        }
        if (this.socketService) {
          this.socketService.disconnect();
          this.socketService = undefined;
        }
        if (this.vscodeRuntimeActionHandler) {
          this.vscodeRuntimeActionHandler = undefined;
        }
      }),
    );

    webviewView.onDidDispose(
      () => {
        console.log(
          "[OpenHands Extension] Webview panel for OpenHandsViewProvider disposed.",
        );
        if (this.socketService) {
          this.socketService.disconnect();
          this.socketService = undefined;
        }
        if (this.vscodeRuntimeActionHandler) {
          this.vscodeRuntimeActionHandler = undefined;
        }
        this.view = undefined;
      },
      null,
      this.context.subscriptions,
    );
  }

  private async handleWebviewMessage(message: WebviewMessage) {
    if (!this.view) {
      console.warn("[OpenHands Extension] No view available for message:", message.type);
      return;
    }
    console.log("[OpenHands Extension] Handling webview message:", message.type, message);
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
          await this.performHealthCheck();
          break;
        case "openFile":
          if (message.data && message.data.path) {
            await this.handleOpenFileRequest(message.data.path);
          } else {
            console.warn("[OpenHands Extension] Received openFile request without a valid path.");
            vscode.window.showWarningMessage("Could not open item: Path not provided.");
          }
          break;
        default:
          console.warn("[OpenHands Extension] Unknown message type from webview:", message.type);
      }
    } catch (error) {
      console.error("[OpenHands Extension] Error handling webview message:", error);
      this.postMessageToWebview({
        type: "error",
        message: `Error handling message: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  private async handleUserPrompt(text: string) {
    try {
      if (!this.conversationId) {
        console.log("[OpenHands Extension] No active conversation, creating new one.");
        await this.createConversation(text);
      }

      if (!this.socketService || !this.socketService.isConnected()) {
        console.log("[OpenHands Extension] Socket service not ready or disconnected, creating/connecting.");
        this.createSocketService();
        this.socketService!.connect();
      } else if (this.socketService.isConnected() && !this.vscodeRuntimeActionHandler) {
        const rawSocket = this.socketService.socket;
        if (rawSocket) {
          console.warn("[OpenHands Extension] Socket connected, but VsCodeRuntimeActionHandler missing. Re-initializing.");
          this.vscodeRuntimeActionHandler = new VsCodeRuntimeActionHandler(rawSocket);
        } else {
           console.error("[OpenHands Extension] Socket connected, but raw socket unavailable for VsCodeRuntimeActionHandler.");
        }
      }

      console.log("[OpenHands Extension] Sending user prompt via socket service.");
      this.socketService!.sendMessage(text);

    } catch (error) {
      console.error("[OpenHands Extension] Error in handleUserPrompt:", error);
      if (error instanceof Error && error.message === "SETTINGS_NOT_FOUND_ERROR") {
        this.postMessageToWebview({
          type: "status",
          message: "LLM settings not found. Please configure your LLM API key and model in the OpenHands settings.",
        });
      } else {
        this.postMessageToWebview({
          type: "error",
          message: error instanceof Error ? error.message : "Unknown error occurred during prompt handling.",
        });
      }
    }
  }

  private async startNewConversation() {
    console.log("[OpenHands Extension] Starting new conversation.");
    if (this.socketService) {
      this.socketService.disconnect();
      this.socketService = undefined;
    }
    if (this.vscodeRuntimeActionHandler) {
      this.vscodeRuntimeActionHandler = undefined;
      console.log("[OpenHands Extension] VsCodeRuntimeActionHandler cleared for new conversation.");
    }
    this.conversationId = null;
    this.postMessageToWebview({ type: "clearChat" });
    await this.performHealthCheck();
  }

  private async createConversation(initialMessage: string) {
    try {
      console.log("[OpenHands Extension] Creating new conversation on backend.");
      this.conversationId = await this.conversationService.createConversation(initialMessage);
      console.log("[OpenHands Extension] Created conversation with ID:", this.conversationId);
    } catch (error) {
      console.error("[OpenHands Extension] Failed to create conversation:", error);
      if (error instanceof Error && error.message === "SETTINGS_NOT_FOUND_ERROR") {
        throw error;
      }
      throw new Error(
        `Failed to create conversation: ${error instanceof Error ? error.message : "Unknown server error"}`,
      );
    }
  }

  private createSocketService() {
    if (!this.conversationId) {
      console.error("[OpenHands Extension] Cannot create socket service: conversationId is null.");
      throw new Error("Cannot create socket service without conversation ID.");
    }
    console.log(`[OpenHands Extension] Creating SocketService for conversation: ${this.conversationId}`);
    if (this.vscodeRuntimeActionHandler) {
        this.vscodeRuntimeActionHandler = undefined;
        console.log("[OpenHands Extension] Cleared previous VsCodeRuntimeActionHandler before new SocketService.");
    }

    this.socketService = new SocketService({
      serverUrl: this.serverUrl,
      conversationId: this.conversationId,
      onWebviewEvent: (event: SocketMessage) => {
        if ("status_update" in event) {
          this.postMessageToWebview({ type: "statusUpdate", data: event });
        } else {
          this.postMessageToWebview({ type: "agentResponse", data: event });
        }
      },
      onRuntimeAction: (event: DelegatedActionOhEvent) => {
        console.log("[OpenHands Extension] Received runtime action via onRuntimeAction:", event.action, "ID:", event.id);
        if (this.vscodeRuntimeActionHandler) {
          this.vscodeRuntimeActionHandler.handleAction(event)
            .then(() => console.log(`[OpenHands Extension] Runtime action ${event.action} (ID: ${event.id}) handled.`))
            .catch(err => {
                console.error(`[OpenHands Extension] Error in vscodeRuntimeActionHandler.handleAction for ${event.action} (ID: ${event.id}):`, err);
            });
        } else {
          console.error("[OpenHands Extension] VsCodeRuntimeActionHandler not initialized. Cannot handle runtime action:", event.action );
        }
      },
      onConnect: () => {
        console.log("[OpenHands Extension] SocketService onConnect callback triggered.");
        this.postMessageToWebview({ type: "status", message: "Agent connected" });
        if (this.socketService && this.socketService.socket) {
          console.log("[OpenHands Extension] Socket connected, initializing VsCodeRuntimeActionHandler.");
          this.vscodeRuntimeActionHandler = new VsCodeRuntimeActionHandler(this.socketService.socket);
        } else {
            console.error("[OpenHands Extension] Socket connected, but raw socket unavailable for VsCodeRuntimeActionHandler initialization.");
        }
      },
      onDisconnect: (reason: string) => {
        console.log(`[OpenHands Extension] SocketService onDisconnect callback: ${reason}`);
        this.postMessageToWebview({ type: "status", message: `Agent disconnected: ${reason}` });
        if (this.vscodeRuntimeActionHandler) {
          this.vscodeRuntimeActionHandler = undefined;
          console.log("[OpenHands Extension] VsCodeRuntimeActionHandler cleared due to socket disconnect.");
        }
      },
      onError: (error: Error) => {
        console.error("[OpenHands Extension] SocketService onError callback:", error);
        this.postMessageToWebview({ type: "error", message: error.message });
      },
    });
  }

  private async performHealthCheck() {
    try {
      console.log("[OpenHands Extension] Performing health check...");
      const healthResult = await this.healthService.checkHealth();
      this.postMessageToWebview({ type: "healthCheck", data: healthResult });
    } catch (error) {
      console.error("[OpenHands Extension] Health check failed:", error);
      this.postMessageToWebview({
        type: "healthCheck",
        data: { isHealthy: false, error: error instanceof Error ? error.message : "Unknown health check error" },
      });
    }
  }

  private async handleOpenFileRequest(itemPath: string) {
    console.log(`[OpenHands Extension] Processing openFile request for: ${itemPath}`);
    try {
      const itemStat = await fs.promises.stat(itemPath);
      if (itemStat.isDirectory()) {
        const dirUri = vscode.Uri.file(itemPath);
        await vscode.commands.executeCommand("workbench.view.explorer");
        await vscode.commands.executeCommand("revealInExplorer", dirUri);
      } else if (itemStat.isFile()) {
        const fileUri = vscode.Uri.file(itemPath);
        const document = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(document);
      } else {
        vscode.window.showWarningMessage(`Cannot open: ${itemPath} is not a file or directory.`);
      }
    } catch (error) {
      console.error(`[OpenHands Extension] Error processing path ${itemPath}:`, error);
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === "ENOENT") {
        vscode.window.showErrorMessage(`Path not found: ${itemPath}`);
      } else {
        vscode.window.showErrorMessage(`Failed to process path: ${itemPath}. ${error instanceof Error ? error.message : ""}`);
      }
    }
  }

  private postMessageToWebview(message: WebviewMessage) {
    if (this.view && this.view.webview) {
      this.view.webview.postMessage(message);
    } else {
      console.warn("[OpenHands Extension] Cannot post message: Webview not available.", message.type);
    }
  }

  private _getNonce(): string {
    return getNonce();
  }

  private _getUri(webview: vscode.Webview, ...pathSegments: string[]): vscode.Uri {
    return webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, ...pathSegments));
  }

  private _getCspDirectives(webview: vscode.Webview, nonce: string): string {
    const { cspSource } = webview;
    const serverHttpUrl = this.serverUrl.replace(/\/\/$/, "");
    const serverWsUrl = serverHttpUrl.replace(/^http/, "ws");
    return `default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src ${serverHttpUrl} ${serverWsUrl}; img-src ${cspSource} data:; font-src ${cspSource};`;
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = this._getNonce();
    const scriptUri = this._getUri(webview, "dist", "webview.iife.js");
    const styleCssUri = this._getUri(webview, "dist", "webview.css");
    const styleResetUri = this._getUri(webview, "media", "reset.css");
    const styleVSCodeUri = this._getUri(webview, "media", "vscode.css");
    const cspDirectives = this._getCspDirectives(webview, nonce);

    const templatePath = path.join(this.extensionUri.fsPath, "src", "extension", "webview", "template.html");

    let htmlContent: string;
    try {
      htmlContent = fs.readFileSync(templatePath, "utf-8");
    } catch (error) {
      console.error("[OpenHands Extension] Error reading HTML template:", templatePath, error);
      return `<html><body><p style="color:var(--vscode-editor-foreground); padding:20px;">Error loading webview content. Failed to read template file at: ${templatePath}. Error: ${error instanceof Error ? error.message : String(error)}</p></body></html>`;
    }

    htmlContent = htmlContent.replace(/{{CSP_DIRECTIVES}}/g, cspDirectives);
    htmlContent = htmlContent.replace(/{{NONCE}}/g, nonce);
    htmlContent = htmlContent.replace(/{{SCRIPT_URI}}/g, scriptUri.toString());
    htmlContent = htmlContent.replace(/{{STYLE_RESET_URI}}/g, styleResetUri.toString());
    htmlContent = htmlContent.replace(/{{STYLE_VSCODE_URI}}/g, styleVSCodeUri.toString());
    htmlContent = htmlContent.replace(/{{STYLE_CSS_URI}}/g, styleCssUri.toString());
    htmlContent = htmlContent.replace(/{{SCRIPT_URI_LOG}}/g, scriptUri.toString());
    htmlContent = htmlContent.replace(/{{STYLE_CSS_URI_LOG}}/g, styleCssUri.toString());

    return htmlContent;
  }
}

function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
