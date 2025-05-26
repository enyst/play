# VS Code OpenHands Tab Extension - Project Plan & Status

## 0. Current Development Questions (May 2025)

Based on analysis of the current PoC state, these questions will help guide the next development phase:

### 1. **Immediate Goals**
Adapt the current web frontend to the vscode environment. Use the same libraries and versions as much as possible. Verify periodically.


### 1.1. UI/UX Adaptation Strategy (Updated May 26, 2025)

Regarding the adaptation of the web frontend's UI/UX to the VS Code environment:
*   **Prioritize Native Look and Feel:** For UI components within the webview, the primary goal is to achieve a look and feel that is native to VS Code. This enhances user experience and integration within the editor.
*   **Challenge with UI Toolkit:** The official `@vscode/webview-ui-toolkit` was identified as deprecated as of January 2025 (GitHub issue #561 in `microsoft/vscode-webview-ui-toolkit`). Therefore, it will not be used.
*   **UI Approach for Chat Content and Shell:**
    *   **Chat Message Stream (Webview):** To achieve rich display (Markdown, code highlighting, distinct event types) and maximize reuse from the web frontend, we will adopt **Tailwind CSS** and **`react-markdown`** (with its associated ecosystem like `remark-gfm` and syntax highlighters). Components like `ChatMessage.tsx` and `GenericEventMessage.tsx` from the web frontend will be adapted. This directly addresses the need for styled and differentiated event rendering.
    *   **Extension Shell UI (Buttons, Inputs outside message stream):** For general UI elements like the main input bar, status indicators, and buttons not part of the chat message stream, we will also **leverage Tailwind CSS**. This ensures a consistent styling approach across the entire webview and maximizes the utility of having Tailwind integrated.
*   **No Embedded Editor:** File display and diffing will continue to rely on VS Code's native editor capabilities, not on an embedded editor component like Monaco within the webview.


### 1.2. Leveraging VS Code Native Capabilities (May 2025)

A core principle for the VS Code extension is to deeply integrate with the editor's native functionalities for a superior user experience, rather than merely replicating web frontend behavior within the webview.

*   **File Operations (Viewing and Editing):**
    *   **Viewing Files (`FileReadAction` / `ReadObservation`):** Instead of displaying file content directly in the webview chat (as the web frontend might), the extension should primarily indicate *that* a file was read (e.g., "Agent read `path/to/file.py`"). The webview message could make the file path a clickable link.
    *   **Click-to-Open:** Clicking this link in the webview should command VS Code to open the specified file in a new editor tab or focus it if already open. This allows users to view the file with full VS Code features (syntax highlighting, navigation, etc.).
    *   **Editing Files (`FileEditAction` / `EditObservation`):** When the agent performs an edit, the extension should:
        *   Notify the user in the webview (e.g., "Agent edited `path/to/file.py`").
        *   Apply the changes directly to the file on disk.
        *   Open or focus the modified file in VS Code, showing a diff view. Users can then leverage VS Code's built-in diff viewers, undo/redo, and source control.
    *   **Rationale:** This approach is more powerful and familiar for VS Code users. It avoids duplicating editor functionality in the webview and keeps the chat log cleaner.

*   **Command Execution (`CommandAction` / `CommandObservation`):**
    *   **Integrated Terminal:** Instead of just displaying command text and output in the webview, the extension should strive to execute commands in a dedicated VS Code integrated terminal associated with the OpenHands agent.
    *   **Execution Flow:**
        1.  Agent decides to run a command (`CommandAction`).
        2.  Extension receives this, potentially shows "Agent wants to run: `command`" in the webview.
        3.  If user confirmation is required and given, or if auto-confirmed:
            *   The extension ensures an integrated terminal (e.g., named "OpenHands Agent") is open.
            *   The command is sent to and executed in this terminal.
            *   STDOUT/STDERR from the terminal are captured as the `CommandObservation` and also displayed in the webview (potentially truncated, with an option to see full output in the terminal).
    *   **Rationale:** This provides a true interactive terminal experience, allows users to see commands run in a familiar environment, and handles complex terminal I/O or long-running processes better than a static text display in the webview.

*   **General Principle:** For any agent action/observation that has a strong parallel to a VS Code feature (file system, terminal, source control, search), the extension should prefer orchestrating the VS Code feature rather than reimplementing a less capable version in the webview.

### 2. **Testing**
In the web frontend, we use the following testing tools. We should verify and add them to the extension if missing.
- Test Runner: Vitest
- Rendering: React Testing Library
- User Interactions: @testing-library/user-event
- API Mocking: Mock Service Worker (MSW)
- Code Coverage: Vitest with V8 coverage

### 3. **Configuration System Scope**
- The plan calls for ALL config.template.toml settings to be configurable. That's quite extensive - is this a near-term priority or can it be phased?
A: MOST of the settings defined in the config.template.toml example file. (e.g., model, max_tokens, etc.) Note that they are many, and they are per section, so we need to define a way to configure them.
- Should we implement a subset first (e.g., model selection, basic agent settings) and expand later?
A: The extension runs locally, directly on the user machine, so we don't need all sandbox options (they are about docker, etc.). We will use only CLIRuntime, so other runtimes or their options are not needed. There may be other options we don't need for similar reasons, that's why we need to go through them all, and figure out what goes here.

### 4. **Testing Strategy**
- We are testing both the extension host logic and the webview logic.
- What testing frameworks?
A: Vitest for webview (React) tests (aligning with web frontend) and Mocha with @vscode/test-electron for extension host tests.
- Should we set up integration tests with a mock OpenHands backend?
A: Yes.

---

## 0.1. Original Open Questions regarding MVP features and priorities:

OpenHands-Agent asked:
1.  **Core Agent Interaction:**
    *   How should complex agent outputs (e.g., long file contents, very verbose observations) be handled in the MVP?
    A: Truncate.

2.  **Error Handling and Backend Dependency (MVP Focus):**
    *   How should the *extension* behave when the *server-side agent* has issues or becomes unresponsive (e.g., crashes or is unresponsive)?
    A: Show error message, and if the error message doesn't say it, then also tell the user to check the backend server and potentially restart it. The extension relies on a functional backend connection for all agent interactions.
    *   Should there be an explicit "Reset/Start New Conversation" button in the UI if things go wrong?
    A: Start New Conversation button, it should be above the chat input box. **(Implemented)**

3.  **UI/UX Must-Haves for MVP:**
    *   Markdown rendering.
    *   Loading indicators same as current web frontend. **(Basic status messages like "Agent is processing..." implemented)**

4.  **Configuration & Setup (MVP):**
    *   MOST of the settings defined in the config.template.toml example file are necessary (e.g., model, max_tokens, etc.). Note that they are many, and they are per section, so we need to define a way to configure them.

5.  **"Definition of Done" for MVP:**
    *   What key scenarios would you test to say "the MVP is working and meets its goals"?
    A: End to end: the agent is working and succeeds a task. All errors handled by the current web frontend are handled by the extension too. Unit testing with good coverage.


## 1. Aim of the Extension

The primary goal is to create a Visual Studio Code extension that integrates OpenHands directly into the editor. This extension:

*   Adds an "OpenHands" tab to the VS Code Activity Bar.
*   Provides a user interface within this tab where users can enter prompts.
*   Executes the `openhands-agent` with the given prompt.
*   Displays the full interaction (user prompts and agent responses/actions) in a chat-like view.
*   Facilitates communication with the OpenHands backend server.

### 1.1. Guiding Principle: Maximize Reuse from Web Frontend

To accelerate development and ensure consistency, this extension will strive to:

*   **Reuse Code and Libraries:** Wherever feasible, adapt or directly use code, components, and libraries from the existing OpenHands web frontend.
*   **Align on Technology and Style:** This includes adopting TypeScript as the primary language for the extension's webview and potentially parts of the extension host logic. Code style, state management approaches (e.g., hooks if applicable in the webview context), and general architectural patterns should also align with the web frontend.
*   **Shared UI/UX:** Aim for a user experience that is familiar to users of the web frontend, particularly in how chat interactions are displayed and managed.


## 2. User-Agent Chat Flow

1.  The user opens the "OpenHands" tab in VS Code.
2.  The user types a prompt into an input field and submits it.
3.  **Initial Interaction (if no active conversation):**
    *   The extension sends an HTTP POST request to the OpenHands server's `/api/conversations` endpoint (e.g., `http://localhost:3000/api/conversations`) with the initial prompt.
    *   The server returns a `conversation_id`.
    *   The extension stores this `conversation_id`.
    *   OPEN QUESTION: Where does it store?
4.  **Socket.IO Connection:**
    *   The extension establishes a Socket.IO connection to the OpenHands server (e.g., `ws://localhost:3000/`) using the obtained `conversation_id` and `latest_event_id=-1` as query parameters.
5.  **Sending Subsequent Prompts:**
    *   For the initial prompt (after HTTP setup) and all subsequent prompts, the extension sends a message over the Socket.IO connection.
    *   The event name is `oh_user_action`.
    *   The payload is `{"action": "message", "args": {"content": "user_message_here", "image_urls": []}}`.
6.  **Receiving Agent Responses:**
    *   The extension listens for `oh_event` messages from the Socket.IO server.
    *   These events can include agent messages (`action: "message"`), thoughts (`action: "think"`), agent actions (e.g., `action: "run"`), observations (e.g., `CmdOutputObservation`), errors, or status updates.
7.  **Displaying Interaction:**
    *   Both user prompts and received agent events are displayed in a scrolling chat view within the OpenHands tab.
    *   Different types of agent messages (e.g., errors, status, regular messages, observations) are formatted appropriately.

## 3. Full Project Plan

**Phase 1: Basic Extension Setup & UI (Completed)**

**Phase 2: Backend Communication - HTTP & Socket.IO (Completed)**

1.  **Investigate OpenHands Server:**
    *   Identified HTTP POST to `/api/conversations` with `{"initial_user_msg": "..."}` for conversation creation.
    *   Identified Socket.IO connection to `ws://localhost:3000/` with query params `conversation_id={id}&latest_event_id=-1`.
    *   Confirmed default authentication (`DefaultUserAuth`, `user_id=None`) and Socket.IO validation (`DefaultConversationValidator`) allow this flow.
    *   Confirmed Socket.IO message structure: `oh_user_action` (send) and `oh_event` (receive).
2.  **Add Dependencies:**
    *   Added `"socket.io-client": "^4.7.5"` to `package.json` for `extension.js`.
3.  **Implement HTTP Conversation Initiation:**
    *   On first user prompt, make an HTTP POST to `_SERVER_URL + '/api/conversations'`.
    *   Store `_conversationId` from the response.
    *   Handle HTTP errors and notify webview.
4.  **Implement Socket.IO Connection & Messaging:**
    *   Initialize `this._socket = io(this._SERVER_URL, { query: {...} });`.
    *   Set up `connect`, `oh_event`, `disconnect`, `error`, `connect_error` listeners.
    *   `oh_event` listener forwards data to webview via `postMessage`.
    *   Implement `sendSocketMessage(promptText)` to emit `oh_user_action`.
5.  **Integrate with Webview:**
    *   Updated webview JavaScript to handle `agentResponse` data containing full `oh_event` payloads, errors, or status messages from `extension.js`.
    *   Display different types of information appropriately.

**Phase 3: Core Improvements, Refinements & Testing**

0.  **Foundation: TypeScript Rewrite & Code Restructuring (COMPLETED):**
    *   **Goal:** Transition the existing `extension.js` (and its associated webview HTML/JS) to TypeScript.
    *   **Tasks:**
        *   ✅ Convert `extension.js` (extension host part) to TypeScript (`.ts`).
        *   ✅ Convert the webview's inline JavaScript to separate TypeScript/React files (`.tsx`).
        *   ✅ Set up a TypeScript build process using `tsc` for extension and Vite for webview.
        *   ✅ Refactor the monolithic structure into smaller, manageable modules/components.
        *   ✅ Establish clear separation of concerns (UI, state management, communication logic).
        *   ✅ **Frontend Alignment:** Adopted React, TypeScript, and modern tooling to match web frontend.
    *   **Completed:** Full TypeScript migration with React-based webview, modular architecture, and build system aligned with web frontend practices.

1.  **Error Handling & Resilience:** Enhance robustness of error handling. (e.g., retry mechanisms, clearer user feedback for persistent failures).
    *   **Completed (Partial):** Implemented a client-side agent response timeout to notify users if the agent appears unresponsive.
2.  **UI/UX Enhancements:**
    *   Improve formatting for code blocks, markdown, and other rich content from the agent. (Align with web frontend, reuse libraries like `markdown-it` or similar if used by the main frontend).
    *   Implement loading indicators or busy states more explicitly. **(Basic "Agent is processing..." status implemented)**
    *   Add functionality to clear conversation history or start a new conversation explicitly. **(Completed: "Start New Conversation" button implemented)**
3.  **Configuration:** Make `_SERVER_URL` configurable via VS Code settings. **(Completed)**
4.  **License:** Address `package.json` license warning. **(Completed: "UNLICENSED" added)**
5.  **Testing:**
    *   **Testing Frameworks Setup (COMPLETED):**
        *   **Webview (React) Tests:**
            *   **Framework:** Vitest (see `vite.config.ts`, `src/test/setup.ts`).
            *   **Location:** `src/webview/**/*.spec.tsx`, `src/shared/**/*.spec.ts`.
            *   **Run:** `npm test`.
            *   **Status:** Initial setup with sample tests for components (e.g., `StatusBar.spec.tsx`) and utilities (e.g., `src/shared/utils/index.spec.ts`) passing.
        *   **Extension Host Tests:**
            *   **Framework:** Mocha with `@vscode/test-electron`.
            *   **Location:** Runner (`src/test/runTest.ts`), suite entry (`src/test/suite/index.ts`), tests (`src/test/suite/**/*.test.ts`).
            *   **Run:** `npm run test:extension` or "Extension Tests" launch configuration.
            *   **Status:** Initial setup with a sample extension test (`extension.test.ts`) passing.
    *   Test with a live OpenHands server across various scenarios (complex prompts, server errors, disconnections, long messages).
    *   Test edge cases for UI and communication.
    *   Improve server/agent error reporting: continue to refine how the extension handles and reports any server-side agent issues. The current timeout and basic error messages are a good start.
6.  **Documentation:** Create/update a `README.md` specifically for the extension within its directory. (COMPLETED)

## 4. Current Extension Architecture (Post-TypeScript Migration)

### 4.1. Project Structure

```
openhands-tab/
├── src/
│   ├── extension/                    # Extension host code (Node.js context)
│   │   ├── index.ts                 # Main extension entry point
│   │   ├── webview-provider.ts      # Webview management and communication
│   │   └── services/
│   │       ├── conversation-service.ts  # HTTP API communication
│   │       └── socket-service.ts        # Socket.IO real-time communication
│   ├── webview/                     # Webview UI code (Browser context)
│   │   ├── index.tsx               # React app entry point
│   │   ├── components/
│   │   │   ├── App.tsx             # Main app component
│   │   │   ├── ChatInterface.tsx   # Chat container
│   │   │   ├── ChatInput.tsx       # Message input component
│   │   │   ├── ChatMessage.tsx     # Individual message display
│   │   │   ├── Messages.tsx        # Message list container
│   │   │   └── StatusBar.tsx       # Connection status and controls
│   │   ├── hooks/
│   │   │   └── useVSCodeAPI.ts     # VSCode API integration hook
│   │   └── styles/
│   │       └── index.css           # Component styles
│   └── shared/                     # Shared types and utilities
│       ├── types/
│       │   ├── index.ts           # Common type exports
│       │   └── message.ts         # Message and event types
│       └── utils/
│           └── index.ts           # Shared utility functions
├── out/                           # Compiled extension code (TypeScript → JavaScript)
├── dist/                          # Compiled webview code (Vite bundle)
├── media/                         # Static assets (CSS, icons)
├── package.json                   # Extension manifest and dependencies
├── tsconfig.json                  # TypeScript config for webview
├── tsconfig.extension.json        # TypeScript config for extension
├── vite.config.ts                 # Vite bundler configuration
├── .eslintrc                      # ESLint configuration (aligned with frontend)
└── .prettierrc.json              # Prettier configuration (aligned with frontend)
```

### 4.2. Technology Stack & Frontend Alignment

**Aligned with OpenHands Web Frontend:**
- **React 19.1.0** - Same version as web frontend
- **TypeScript 5.8.3** - Latest version for better tooling
- **Vite 6.3.5** - Modern build tool for webview bundling
- **ESLint + Prettier** - Exact same configuration as web frontend
- **react-markdown 10.1.0** - Same markdown rendering library
- **socket.io-client 4.8.1** - Same WebSocket client library
- **clsx 2.1.1** - Same utility for conditional CSS classes

**VSCode-Specific:**
- **@types/vscode ^1.96.0** - VSCode API types
- **vsce** - Extension packaging tool

### 4.3. Build System

**Dual Build Process:**
1. **Extension Host** (`npm run build:extension`): TypeScript → JavaScript using `tsc`
2. **Webview** (`npm run build:webview`): React/TypeScript → Bundled JavaScript using Vite

**Development Workflow:**
- `npm run dev` - Watch mode for both extension and webview
- `npm run compile` - Full build for packaging
- `npm run lint` - ESLint + Prettier checking (matches frontend workflow)
- `npm run lint:fix` - Auto-fix formatting and linting issues

### 4.4. Communication Architecture

**Extension Host ↔ Webview:**
- Message passing via VSCode's `postMessage` API
- Type-safe communication using shared TypeScript interfaces

**Extension ↔ OpenHands Backend:**
- HTTP API for conversation initialization (`/api/conversations`)
- Socket.IO for real-time message exchange (`oh_user_action` / `oh_event`)

## 5. Current Stage (Updated December 2024)

**COMPLETED PHASES:**

*   ✅ **Phase 1 (Basic Extension Setup & UI)** - COMPLETE
*   ✅ **Phase 2 (Backend Communication - HTTP & Socket.IO)** - COMPLETE
*   ✅ **Phase 3.0 (TypeScript Migration & Frontend Alignment)** - COMPLETE
    *   Full TypeScript migration with React-based webview
    *   Modular architecture with clear separation of concerns
    *   Build system using TypeScript + Vite
    *   ESLint/Prettier configuration matching web frontend exactly
    *   Dependencies aligned with web frontend versions
    *   Extension successfully packages to `.vsix`

**CURRENT CAPABILITIES:**
*   Server URL configurable via VS Code settings
*   Full conversation flow: HTTP initialization → Socket.IO real-time communication
*   React-based UI with markdown rendering support
*   "Start New Conversation" functionality
*   Connection status indicators
*   Error handling and timeout management
*   Type-safe communication between extension host and webview

**NEXT PRIORITIES:**
*   Deploy and test extension in VSCode environment
*   Implement comprehensive testing infrastructure (unit + integration)
*   Enhanced markdown rendering and UI polish
*   Configuration system for OpenHands settings (model, max_tokens, etc.)

## 5. Frontend Alignment Implementation Details

**Key Achievement:** Extension maintains full functionality while now using identical linting and formatting standards as the web frontend, ensuring code consistency across the OpenHands ecosystem.
