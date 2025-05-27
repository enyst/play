
## VS Code Extension (openhands-tab)

The VS Code extension is located in `/Users/enyst/repos/play/openhands/runtime/utils/vscode-extensions/openhands-tab`.

### Building the Extension

After making changes to the extension code (either in `src/extension/*` or `src/webview/*`), you need to rebuild it.
Navigate to the extension's directory:
`cd /Users/enyst/repos/play/openhands/runtime/utils/vscode-extensions/openhands-tab`

Then, run the compile command:
`npm run compile`

This command handles both the extension host and webview builds.
Alternatively, you can run individual build commands:
*   For the extension host: `npm run build:extension`
*   For the webview UI: `npm run build:webview`

Prefer the minimal option.