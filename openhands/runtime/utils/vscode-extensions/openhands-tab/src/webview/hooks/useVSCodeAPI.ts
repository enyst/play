import { WebviewMessage } from "../../shared/types";

declare global {
  interface Window {
    acquireVsCodeApi(): {
      postMessage: (message: WebviewMessage) => void;
      getState: () => any;
      setState: (state: any) => void;
    };
  }
}

export function useVSCodeAPI() {
  const vscode = window.acquireVsCodeApi();

  return {
    postMessage: (message: WebviewMessage) => {
      console.log("[Webview] Sending message to extension:", message.type, message);
      try {
        vscode.postMessage(message);
        console.log("[Webview] Message sent successfully");
      } catch (error) {
        console.error("[Webview] Error sending message:", error);
      }
    },
    getState: () => vscode.getState(),
    setState: (state: any) => vscode.setState(state),
  };
}
