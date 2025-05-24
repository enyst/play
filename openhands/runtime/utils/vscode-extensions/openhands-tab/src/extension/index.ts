import * as vscode from "vscode";
import { OpenHandsViewProvider } from "./webview-provider";

export function activate(context: vscode.ExtensionContext) {
  try {
    console.log("OpenHands extension is now active!");
    console.log("Extension URI:", context.extensionUri.toString());
    console.log("Registering webview provider for viewType:", OpenHandsViewProvider.viewType);

    const provider = new OpenHandsViewProvider(context.extensionUri, context);

    const disposable = vscode.window.registerWebviewViewProvider(
      OpenHandsViewProvider.viewType,
      provider,
    );

    context.subscriptions.push(disposable);

    console.log("Webview provider registered successfully");
  } catch (error) {
    console.error("Error during extension activation:", error);
    throw error;
  }
}

export function deactivate() {
  console.log("OpenHands extension is being deactivated");
}
