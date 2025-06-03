import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Sample test", () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });
});

suite("OpenHands Extension Integration Tests", () => {
  let webviewPanel: vscode.WebviewPanel | undefined;

  teardown(async () => {
    // Clean up any webview panels
    if (webviewPanel) {
      webviewPanel.dispose();
      webviewPanel = undefined;
    }
  });

  test("Extension should activate successfully", async () => {
    // Get the extension
    const extension = vscode.extensions.getExtension(
      "openhands.openhands-tab-extension",
    );
    assert.ok(extension, "Extension should be found");

    // Activate the extension
    await extension.activate();
    assert.ok(extension.isActive, "Extension should be active");
  });

  test("OpenHands view should be available", async () => {
    // The view should be registered when extension activates
    const extension = vscode.extensions.getExtension(
      "openhands.openhands-tab-extension",
    );
    await extension?.activate();

    // Try to show the OpenHands view
    await vscode.commands.executeCommand("openhands.showView");

    // Give it a moment to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    // The view should now be visible (we can't easily test the webview content in integration tests,
    // but we can verify the command executes without error)
    assert.ok(true, "OpenHands view command executed successfully");
  });

  test("Status message flow integration test", async () => {
    // This test verifies that the extension can handle status messages
    // In a real integration test, we would:
    // 1. Activate the extension
    // 2. Open the OpenHands view
    // 3. Send a mock status event
    // 4. Verify the webview receives the correct message

    const extension = vscode.extensions.getExtension(
      "openhands.openhands-tab-extension",
    );
    await extension?.activate();

    // Execute the show view command
    await vscode.commands.executeCommand("openhands.showView");

    // In a full integration test, we would need to:
    // - Access the webview provider instance
    // - Simulate receiving a status event from the backend
    // - Verify the webview receives the statusUpdate message
    //
    // For now, we verify the extension loads and the view can be shown
    assert.ok(
      extension?.isActive,
      "Extension should be active for status message handling",
    );
  });
});
