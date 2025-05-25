# OpenHands Tab VS Code Extension

This Visual Studio Code extension integrates OpenHands directly into the editor, allowing users to interact with the OpenHands agent through a dedicated tab.

## Aim of the Extension

The primary goal is to create a Visual Studio Code extension that integrates OpenHands directly into the editor. This extension:

*   Adds an "OpenHands" tab to the VS Code Activity Bar.
*   Provides a user interface within this tab where users can enter prompts.
*   Executes the `openhands-agent` with the given prompt.
*   Displays the full interaction (user prompts and agent responses/actions) in a chat-like view.
*   Facilitates communication with the OpenHands backend server.

### Guiding Principle: Maximize Reuse from Web Frontend

To accelerate development and ensure consistency, this extension will strive to:

*   **Reuse Code and Libraries:** Wherever feasible, adapt or directly use code, components, and libraries from the existing OpenHands web frontend.
*   **Align on Technology and Style:** This includes adopting TypeScript as the primary language for the extension's webview and potentially parts of the extension host logic. Code style, state management approaches (e.g., hooks if applicable in the webview context), and general architectural patterns should also align with the web frontend.
*   **Shared UI/UX:** Aim for a user experience that is familiar to users of the web frontend, particularly in how chat interactions are displayed and managed.

## Current Capabilities

*   Server URL configurable via VS Code settings.
*   Conversation flow: HTTP initialization → Socket.IO real-time communication.
*   React-based UI with markdown rendering support.
*   "Start New Conversation" functionality.
*   Connection status indicators.
*   Error handling and timeout management.
*   Type-safe communication between extension host and webview.

## Development

### Build System

**Dual Build Process:**
1. **Extension Host** (`npm run build:extension`): TypeScript → JavaScript using `tsc`
2. **Webview** (`npm run build:webview`): React/TypeScript → Bundled JavaScript using Vite

### Development Workflow

- `npm run dev`: Watch mode for both extension and webview.
- `npm run compile`: Full build for packaging.
- `npm run lint`: ESLint + Prettier checking (matches frontend workflow).
- `npm run lint:fix`: Auto-fix formatting and linting issues.

To package the extension for local installation:
- `vsce package`

This will create an `openhands-tab-extension-X.X.X.vsix` file which can be installed in VS Code via "Extensions: Install from VSIX..."

## Project Structure

```
openhands-tab/
├── src/
│   ├── extension/                    # Extension host code (Node.js context)
│   │   ├── index.ts                  # Main extension entry point
│   │   ├── webview-provider.ts       # Webview management and communication
│   │   └── services/
│   │       ├── conversation-service.ts  # HTTP API communication
│   │       └── socket-service.ts        # Socket.IO real-time communication
│   ├── webview/                     # Webview UI code (Browser context)
│   │   ├── index.tsx                # React app entry point
│   │   ├── components/
│   │   │   ├── App.tsx              # Main app component
│   │   │   ├── ChatInterface.tsx    # Chat container
│   │   │   ├── ChatInput.tsx        # Message input component
│   │   │   ├── ChatMessage.tsx      # Individual message display
│   │   │   ├── Messages.tsx         # Message list container
│   │   │   └── StatusBar.tsx        # Connection status and controls
│   │   ├── hooks/
│   │   │   └── useVSCodeAPI.ts      # VSCode API integration hook
│   │   └── styles/
│   │       └── index.css            # Component styles
│   └── shared/                     # Shared types and utilities
│       ├── types/
│       │   ├── index.ts            # Common type exports
│       │   └── message.ts          # Message and event types
│       └── utils/
│           └── index.ts            # Shared utility functions
├── out/                            # Compiled extension code (TypeScript → JavaScript)
├── dist/                           # Compiled webview code (Vite bundle)
├── media/                          # Static assets (CSS, icons)
├── package.json                    # Extension manifest and dependencies
├── tsconfig.json                   # TypeScript config for webview
├── tsconfig.extension.json         # TypeScript config for extension
├── vite.config.ts                  # Vite bundler configuration
├── .eslintrc                       # ESLint configuration (aligned with frontend)
└── .prettierrc.json                # Prettier configuration (aligned with frontend)
```
