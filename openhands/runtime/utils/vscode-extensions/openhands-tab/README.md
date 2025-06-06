# OpenHands Tab VS Code Extension

This Visual Studio Code extension integrates OpenHands directly into the editor, allowing users to interact with the OpenHands agent through a dedicated tab.

## Aim of the Extension

The primary goal is to create a Visual Studio Code extension that integrates OpenHands directly into the editor. This extension:

*   Adds an "OpenHands" tab to the VS Code Activity Bar.
*   Provides a user interface within this tab where users can enter prompts.
*   Executes the `openhands-agent` with the given prompt.
*   Displays the interaction (user prompts and agent responses/actions) in a chat-like view.
*   Integrates deeply with vscode, e.g. opens files in the vscode editor, opens diffs automatically when the agent made edits, reads user edits on the diffs and sends them to the backend server, executes commands in the integrated terminal.
*   Communication with the OpenHands backend server.

### Guiding Principle: Maximize Reuse from Web Frontend

To accelerate development and ensure consistency, this extension will strive to:

*   **Reuse Code and Libraries:** Wherever feasible, adapt or directly use code, components, and libraries from the existing OpenHands web frontend.
*   **Align on Technology and Style:** This includes adopting TypeScript as the primary language for the extension's webview and potentially parts of the extension host logic. Code style, state management approaches (e.g., hooks if applicable in the webview context), and general architectural patterns should also align with the web frontend.
*   **Shared UI/UX:** Aim for a user experience that is familiar to users of the web frontend, particularly in how chat interactions are displayed and managed.

## Recent Updates (Latest)

### Tailwind CSS Integration
*   **Complete UI Overhaul:** All webview components converted from CSS classes to Tailwind utilities
*   **VSCode Theme Integration:** Proper use of VSCode CSS variables for consistent theming
*   **Responsive Design:** Modern responsive layout patterns with Tailwind

### Advanced Event Handling
*   **Event Type Processing:** Comprehensive handling of different OpenHands event types
*   **Smart Display Logic:** File/code events show name-only (ready for VSCode integration)
*   **Collapsible Events:** GenericEventMessage component for expandable event details
*   **Command Execution:** Clean display of command execution with proper status indicators

### Component Architecture
*   **EventMessage.tsx:** Central event type router for different OpenHands actions
*   **GenericEventMessage.tsx:** Reusable collapsible event display component
*   **Enhanced ChatMessage.tsx:** Integrated with new event handling system

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

### Running the Extension in Development

To build, watch for changes, and run the extension in a VS Code Extension Development Host:

1.  **Build and Watch for Changes:**
    Open a terminal in the extension's root directory (`openhands-tab/`) and run:
    ```bash
    npm run dev
    ```
    This command concurrently compiles and watches both the extension host code (TypeScript to JavaScript) and the webview code (React/TypeScript bundled by Vite). Keep this terminal running.

2.  **Start the Extension Development Host:**
    - Open the `openhands-tab` folder in your primary VS Code window.
    - Navigate to "Run" > "Start Debugging", or choose the "OpenHands Tab" debug configuration
    ```json
    {
      "type": "extensionHost",
      "request": "launch",
      "name": "Run Extension",
      "runtimeExecutable": "${execPath}",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/out/extension/**/*.js"
      ],
      "preLaunchTask": "npm: compile"
    }
    ```
    - This will open a new VS Code window (the "Extension Development Host") with the OpenHands Tab extension enabled and running.
    - Changes you make to the source code will be automatically rebuilt by the `npm run dev` process, and you can reload the Extension Development Host window (Developer: Reload Window command) to see them.

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

## Testing

This extension uses two primary frameworks for testing:

### Webview Tests (Vitest) ✅ COMPLETED

-   **Framework:** [Vitest](https://vitest.dev/) (aligned with the OpenHands web frontend)
-   **Purpose:** For testing React components and shared utility functions used in the webview.
-   **Location:** Test files are typically named `*.spec.ts` or `*.spec.tsx` and are co-located with the source files (e.g., `src/webview/components/MyComponent.spec.tsx`, `src/shared/utils/myUtil.spec.ts`).
-   **Setup:**
    -   Vitest configuration: `vite.config.ts`
    -   Test environment setup (e.g., JSDOM): `src/test/setup.ts`
-   **Run:** `npm test`
-   **Status:** ✅ **ALL 45 TESTS PASSING** - Comprehensive unit tests implemented:
    -   `StatusBar.spec.tsx` (11 tests) - Connection status, server health, error handling
    -   `GenericEventMessage.spec.tsx` (11 tests) - Collapsible event messages, success/error states  
    -   `ChatMessage.spec.tsx` (11 tests) - Message rendering, copy functionality, styling
    -   `EventMessage.spec.tsx` (12 tests) - OpenHands event handling, action types, graceful fallbacks

### Extension Host Tests (Mocha)

-   **Framework:** [Mocha](https://mochajs.org/) (with `@vscode/test-electron` for running in a VS Code environment)
-   **Purpose:** For testing the extension host logic, including interaction with VS Code APIs.
-   **Location:**
    -   Test runner script: `src/test/runTest.ts`
    -   Test suite entry point: `src/test/suite/index.ts`
    -   Test files: `src/test/suite/**/*.test.ts`
-   **Run:**
    -   Via npm script: `npm run test:extension`
    -   Via VS Code Launch Configuration: Select "Extension Tests" from the "Run and Debug" panel.
