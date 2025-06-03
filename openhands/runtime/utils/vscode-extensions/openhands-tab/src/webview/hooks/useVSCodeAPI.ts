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

let vscodeApi: ReturnType<typeof window.acquireVsCodeApi> | undefined;

function getVSCodeApi() {
  if (!vscodeApi) {
    vscodeApi = window.acquireVsCodeApi();
  }
  return vscodeApi;
}

export function useVSCodeAPI() {
  const vscode = getVSCodeApi();

  return {
    postMessage: (message: WebviewMessage) => {
      console.log(
        "[Webview] Sending message to extension:",
        message.type,
        message,
      );
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
