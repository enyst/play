# VS Code OpenHands Tab Extension - Project Plan & Status

## 0. Current Development Questions (May 2025)

Based on analysis of the current PoC state, these questions will help guide the next development phase:

### 1. **Immediate Goals & Priorities**
- Are you looking to continue with the TypeScript migration as the plan suggests, or do you have other immediate priorities?
A: TypeScript migration is immediate priority, and very important.
- What's the timeline for this extension - immediate use/demo, or building toward longer-term production?
A: Immediate use/demo, BUT no placeholders, we really need to get this working.

### 2. **Frontend Architecture & Web Frontend Alignment**
- The plan mentions reusing code/libraries from the web frontend. How much alignment do you want with the existing React-based web frontend?
A: As much as possible, adapt the current web frontend to the vscode environment.
- Should we consider using React in the webview, or keep it vanilla TypeScript?
A: Whatever the frontend uses, we should use the same! Same for markdown.

### 3. **Configuration System Scope**
- The plan calls for ALL config.template.toml settings to be configurable. That's quite extensive - is this a near-term priority or can it be phased?
A: MOST of the settings defined in the config.template.toml example file. (e.g., model, max_tokens, etc.) Note that they are many, and they are per section, so we need to define a way to configure them.
- Should we implement a subset first (e.g., model selection, basic agent settings) and expand later?
A: OK, MOST of them, but the extension runs locally, directly on the user machine, so we don't need all sandbox options (they are about docker, etc.). We will use only CLIRuntime, so other runtimes or their options are not needed. There may be other options we don't need for similar reasons, but that's why we need to go through them all, and figure out what goes here.

### 4. **Testing Strategy**
- Are you thinking of testing the extension host logic, the webview logic, or both?
A: Both.
- What testing framework preferences do you have? (Jest, Mocha, VSCode's built-in testing, etc.)
A: Hmm, the web frontend uses vitest. What is VSCode's built-in testing?
- Should we set up integration tests with a mock OpenHands backend?
A: Yes.

---

## 0.1. Original Open Questions regarding MVP features and priorities:

OpenHands-Agent asked:
1.  **Core Agent Interaction:**
    *   You mentioned you're testing agent functionality. What are the absolute minimum agent actions/responses that *must* be reliably handled and displayed in the extension for an MVP? (e.g., simple text messages, executing a bash command and showing output, file reads/writes displayed as observations).
    A: All those defined in backend and served by the openhands/server. We need to talk about this.
    *   How should complex agent outputs (e.g., long file contents, very verbose observations) be handled in the MVP?
    A: Truncate.

2.  **Error Handling and Backend Dependency (MVP Focus):**
    *   How should the *extension* behave when the *server-side agent* has issues or becomes unresponsive (e.g., crashes or is unresponsive)?
    A: Show error message, and if the error message doesn't say it, then also tell the user to check the backend server and potentially restart it. The extension relies on a functional backend connection for all agent interactions.
    *   Should there be an explicit "Reset/Start New Conversation" button in the UI for the MVP if things go wrong?
    A: Start New Conversation button, it should be above the chat input box. **(Implemented)**

3.  **UI/UX Must-Haves for MVP:**
    *   Is the current plain text display of agent messages sufficient for MVP, or is basic markdown rendering (e.g., for code blocks, bold/italics) a must-have?
    A: Markdown rendering.
    *   Are explicit loading indicators (e.g., "Agent is thinking...") critical for the MVP, or is the current implicit waiting acceptable?
    A: Loading indicators same as current web frontend. **(Basic status messages like "Agent is processing..." implemented)**

4.  **Configuration & Setup (MVP):**
    *   The server URL is configurable. Are there any other configuration aspects essential for an MVP?
    A: Yes, ALL the settings defined in the config.template.toml example file. (e.g., model, max_tokens, etc.) Note that they are many, and they are per section, so we need to define a way to configure them.

5.  **"Definition of Done" for MVP:**
    *   What key scenarios would you test to say "the MVP is working and meets its goals"?
    A: End to end: the agent is working and succeeds a task. All errors handled by the current web frontend are handled by the extension too. We also need unit testing, please suggest a strategy.

Your answers to these will help us prioritize the remaining items in Phase 3 and define a clear scope for what you consider a usable MVP. Let me know how the agent testing is going as well, as that heavily influences the next steps!
A: Agent functionality has been successfully addressed, allowing for more reliable end-to-end testing and development of the extension.

## 1. Aim of the Extension

The primary goal is to create a Visual Studio Code extension that integrates OpenHands directly into the editor. This extension will:

*   Add an "OpenHands" tab to the VS Code Activity Bar.
*   Provide a user interface within this tab where users can enter prompts.
*   Execute the `openhands-agent` with the given prompt.
*   Display the full interaction (user prompts and agent responses/actions) in a chat-like view.
*   Facilitate communication with the OpenHands backend server.

### 1.1. Guiding Principle: Maximize Reuse from Web Frontend

To accelerate development, ensure consistency, and leverage existing solutions, this extension will strive to:

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

1.  **Project Initialization:**
    *   Work within the `play` repository.
    *   Target the `experimental-extension` branch for development.
2.  **Core Extension Files (`play/openhands/runtime/utils/vscode-extensions/openhands-tab/`):**
    *   `package.json`: Defines extension manifest (name, publisher, entry point, activation events, contributes view for "OpenHands" tab).
    *   `extension.js`: Main extension logic, including webview provider.
    *   Icon for the activity bar.
    *   `.gitignore`.
3.  **Basic UI (Webview):**
    *   Implement a webview for the OpenHands tab.
    *   Include an input area (textarea) for prompts and a button to send.
    *   Include a display area for messages.
    *   Basic CSS for chat-like appearance.
4.  **Packaging & Testing:**
    *   Package the extension into a `.vsix` file (`vsce package`).
    *   Install and test the basic UI locally in VS Code.
5.  **Initial Commits** (e.g., `4fbaf644`, `7d0a81ba`, `b6159956`).

**Phase 2: Backend Communication - HTTP & Socket.IO (Completed)**

1.  **Investigate OpenHands Server:**
    *   Identified HTTP POST to `/api/conversations` with `{"initial_user_msg": "..."}` for conversation creation.
    *   Identified Socket.IO connection to `ws://localhost:3000/` with query params `conversation_id={id}&latest_event_id=-1`.
    *   Confirmed default authentication (`DefaultUserAuth`, `user_id=None`) and Socket.IO validation (`DefaultConversationValidator`) allow this flow.
    *   Confirmed Socket.IO message structure: `oh_user_action` (send) and `oh_event` (receive).
2.  **Add Dependencies:**
    *   Added `"socket.io-client": "^4.7.5"` to `package.json` for `extension.js`.
    *   Commit: `b767b27e`.
3.  **Implement HTTP Conversation Initiation in `extension.js`:**
    *   On first user prompt, make an HTTP POST to `_SERVER_URL + '/api/conversations'`.
    *   Store `_conversationId` from the response.
    *   Handle HTTP errors and notify webview.
4.  **Implement Socket.IO Connection & Messaging in `extension.js`:**
    *   Initialize `this._socket = io(this._SERVER_URL, { query: {...} });`.
    *   Set up `connect`, `oh_event`, `disconnect`, `error`, `connect_error` listeners.
    *   `oh_event` listener forwards data to webview via `postMessage`.
    *   Implement `sendSocketMessage(promptText)` to emit `oh_user_action`.
5.  **Integrate with Webview:**
    *   Updated webview JavaScript to handle `agentResponse` data containing full `oh_event` payloads, errors, or status messages from `extension.js`.
    *   Display different types of information appropriately.
6.  **Commit for Integration** (e.g., `8bd08f86`).

**Phase 3: Core Improvements, Refinements & Testing**

0.  **Foundation: TypeScript Rewrite & Code Restructuring (COMPLETED):**
    *   **Goal:** Transition the existing `extension.js` (and its associated webview HTML/JS) to TypeScript to improve maintainability, enable better tooling, and align with modern web development practices (and potentially the main OpenHands frontend).
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
5.  **Thorough Testing:**
    *   Test with a live OpenHands server across various scenarios (complex prompts, server errors, disconnections, long messages).
    *   Test edge cases for UI and communication.
    *   Improve server/agent error reporting: While backend stability is much improved, continue to refine how the extension handles and reports any server-side agent issues. The current timeout and basic error messages are a good start.
6.  **Documentation:** Create/update a `README.md` specifically for the extension within its directory.
7.  **Pull Request & Review:** (If this were part of a larger collaborative effort on `enyst/play`) Create a pull request from `experimental-extension` to a main development branch.

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
    *   Extension successfully packages to `.vsix` (1006.54KB)

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
*   Documentation and user guides

## 5. Frontend Alignment Implementation Details

### 5.1. ESLint & Prettier Configuration Alignment

**Completed Actions:**
1. **Copied Frontend ESLint Configuration:** Replicated the exact `.eslintrc` from `frontend/` to extension
2. **Added Missing Dependencies:** Installed all ESLint plugins and configs used by frontend:
   - `eslint-config-airbnb` ^19.0.4
   - `eslint-config-airbnb-typescript` ^18.0.0
   - `eslint-plugin-import` ^2.29.1
   - `eslint-plugin-jsx-a11y` ^6.10.2
   - `eslint-plugin-prettier` ^5.4.0
   - `eslint-plugin-unused-imports` ^4.1.4
   - `prettier` ^3.5.3

3. **Version Compatibility:** Downgraded TypeScript ESLint versions to match frontend:
   - `@typescript-eslint/eslint-plugin` ^7.18.0 (was ^8.18.1)
   - `@typescript-eslint/parser` ^7.18.0 (was ^8.18.1)

4. **Prettier Configuration:** Copied `.prettierrc.json` with `"trailingComma": "all"` setting

5. **Updated Lint Scripts:** Aligned with frontend's approach:
   ```json
   "lint": "npm run typecheck && eslint src --ext .ts,.tsx && prettier --check src/**/*.{ts,tsx}",
   "lint:fix": "eslint src --ext .ts,.tsx --fix && prettier --write src/**/*.{ts,tsx}"
   ```

### 5.2. Code Formatting Results

**Auto-Fixed Issues:**
- ✅ 201 formatting errors automatically resolved
- ✅ Consistent quote style (double quotes)
- ✅ Proper indentation and spacing
- ✅ Trailing commas where appropriate

**Remaining Code Quality Issues (Non-blocking):**
- Console statements (acceptable for development)
- Some TypeScript `any` types (can be refined later)
- React component patterns (can be improved incrementally)
- Minor accessibility issues (button types, labels)

### 5.3. Build System Verification

**Post-Alignment Status:**
- ✅ TypeScript compilation: PASSING
- ✅ Vite webview build: PASSING (1,948.22 kB)
- ✅ Extension packaging: SUCCESSFUL (1006.54KB .vsix)
- ✅ All dependencies installed without conflicts

**Key Achievement:** Extension maintains full functionality while now using identical linting and formatting standards as the web frontend, ensuring code consistency across the OpenHands ecosystem.

## 6. Backend Details: Conversation Start & Metadata

This section outlines the backend process for initiating and managing conversations, with a focus on the creation and importance of `metadata.json`.

### 6.1. New Conversation Creation

1.  **Client Request:** A new conversation is typically initiated when a client (like the VS Code extension or web UI) sends an HTTP POST request to the `/api/conversations` endpoint. This request usually includes an initial user message and potentially other setup parameters (e.g., repository details).
    *   Relevant file: `openhands/server/routes/manage_conversations.py` (handles the `/api/conversations` route).

2.  **Metadata Initialization (`_create_new_conversation` function):**
    *   Upon receiving the POST request, the backend generates a unique `conversation_id` (UUID).
    *   It immediately creates an initial `ConversationMetadata` object. This object includes the `conversation_id`, user details, creation/update timestamps, a default title, and other relevant settings derived from the client request and server configuration.
    *   **Crucially, this `ConversationMetadata` object is then serialized to JSON and saved as `metadata.json` within the session directory** (e.g., `cache/sessions/<conversation_id>/metadata.json`). This is handled by the `ConversationStore` (typically `FileConversationStore`).
        *   Relevant files:
            *   `openhands/server/routes/manage_conversations.py` (specifically `_create_new_conversation` function, which calls `save_metadata`).
            *   `openhands/storage/conversation/file_conversation_store.py` (implements `save_metadata`).
            *   `openhands/storage/data_models/conversation_metadata.py` (defines the `ConversationMetadata` structure).
            *   `openhands/storage/locations.py` (defines how session paths and `metadata.json` filenames are constructed).

3.  **Agent Loop Initialization:**
    *   After successfully saving the initial `metadata.json`, the `_create_new_conversation` function calls `conversation_manager.maybe_start_agent_loop(...)`.
    *   This, in turn, calls `StandaloneConversationManager._start_agent_loop(...)`.
        *   Relevant file: `openhands/server/conversation_manager/standalone_conversation_manager.py`.

4.  **Event Subscription & First Event:**
    *   `_start_agent_loop` creates a `Session` instance and subscribes an internal callback (`_update_conversation_for_event`) to all events originating from this new agent session. This callback is responsible for updating `metadata.json` (e.g., `last_updated_at`, costs, title changes) whenever subsequent events occur.
    *   `_start_agent_loop` then calls `Session.initialize_agent(...)`.
        *   Relevant file: `openhands/server/session/session.py`.
    *   The `Session.initialize_agent` method, very early in its execution, publishes an `AgentStateChangedObservation(..., AgentState.LOADING)` event.

5.  **Metadata Update Callback:**
    *   The `AgentState.LOADING` event (and any subsequent events) triggers the `_update_conversation_for_event` callback.
    *   This callback first attempts to **read `metadata.json`** using `conversation_store.get_metadata()`. It then modifies the loaded metadata (e.g., updates timestamps) and saves it back using `conversation_store.save_metadata()`.

### 6.2. Importance of `metadata.json`

*   The `metadata.json` file is critical. It stores the state and details of a conversation.
*   The backend expects this file to exist for any active or resumed conversation *before* most event processing occurs, particularly for callbacks that update timestamps or other metadata fields.
*   If `metadata.json` is missing when a callback like `_update_conversation_for_event` attempts to read it, a `FileNotFoundError` will occur, typically halting further processing for that event and potentially destabilizing the session.

### 6.3. Conversation Restoration/Rejoining (Client Perspective)

*   When a client wishes to reconnect to an existing conversation, it typically uses a previously obtained `conversation_id` to establish a WebSocket connection directly (bypassing the `/api/conversations` POST request).
*   The backend, upon receiving a WebSocket connection with a `conversation_id`, will attempt to load the corresponding agent session and its `metadata.json`.

### 6.4. Recommendations for Client Robustness

*   **Ensure New Sessions Use `/api/conversations`:** Clients should always use the HTTP POST to `/api/conversations` to initiate truly new conversations. This ensures the backend correctly creates the `conversation_id` and its initial `metadata.json`.
*   **Handle Stale/Invalid `conversation_id`s:** A client might persist a `conversation_id` locally. If this ID becomes stale (e.g., its `metadata.json` was never created due to an interruption, or was deleted on the backend), attempts to rejoin this session will likely lead to errors (like the `FileNotFoundError` if an early event callback tries to access it).
    *   Clients should be prepared for errors when rejoining sessions.
    *   Providing a clear user action (e.g., a "Start New Conversation" button) is important. This allows users to abandon a problematic session ID and force the creation of a fresh session via the `/api/conversations` route.
    *   Optionally, if a client detects critical errors early when trying to use a persisted `conversation_id` (e.g., consistent failures to load session data or specific error messages from the backend), it could proactively clear the stale ID and guide the user towards starting a new conversation.
