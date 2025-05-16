# VS Code OpenHands Tab Extension - Project Plan & Status

## 0. Open Questions regarding MVP features and priorities:

OpenHands-Agent asked:
1.  **Core Agent Interaction:**
    *   You mentioned you're testing agent functionality. What are the absolute minimum agent actions/responses that *must* be reliably handled and displayed in the extension for an MVP? (e.g., simple text messages, executing a bash command and showing output, file reads/writes displayed as observations).
    A: All those defined in backend and served by the openhands/server. We need to talk about this.
    *   How should complex agent outputs (e.g., long file contents, very verbose observations) be handled in the MVP?
    A: Truncate.

2.  **Error Handling and Stability (MVP Focus):**
    *   Given the previous issues with agent stability, what's the MVP expectation for how the *extension* should behave when the *server-side agent* crashes or becomes unresponsive (beyond the current timeout message)?
    A: Show error message, and if the error message doesn't say it, then also tell the user to restart the backend server.
    *   Should there be an explicit "Reset/Start New Conversation" button in the UI for the MVP if things go wrong, or is restarting VS Code / reopening the tab acceptable for now?
    A: Start New Conversation button, it should be above the chat input box.

3.  **UI/UX Must-Haves for MVP:**
    *   Is the current plain text display of agent messages sufficient for MVP, or is basic markdown rendering (e.g., for code blocks, bold/italics) a must-have?
    A: Markdown rendering.
    *   Are explicit loading indicators (e.g., "Agent is thinking...") critical for the MVP, or is the current implicit waiting acceptable?
    A: Loading indicators same as current web frontend.

4.  **Configuration & Setup (MVP):**
    *   The server URL is configurable. Are there any other configuration aspects essential for an MVP?
    A: Yes, ALL the settings defined in the config.template.toml example file. (e.g., model, max_tokens, etc.) Note that they are many, and they are per section, so we need to define a way to configure them.

5.  **"Definition of Done" for MVP:**
    *   What key scenarios would you test to say "the MVP is working and meets its goals"?
    A: End to end: the agent is working and succeeds a task. All errors handled by the current web frontend are handled by the extension too. We also need unit testing, please suggest a strategy.

Your answers to these will help us prioritize the remaining items in Phase 3 and define a clear scope for what you consider a usable MVP. Let me know how the agent testing is going as well, as that heavily influences the next steps!
A: The agent still doesn't work, please ask me about it.

## 1. Aim of the Extension

The primary goal is to create a Visual Studio Code extension that integrates OpenHands directly into the editor. This extension will:

*   Add an "OpenHands" tab to the VS Code Activity Bar.
*   Provide a user interface within this tab where users can enter prompts.
*   Execute the `openhands-agent` with the given prompt.
*   Display the full interaction (user prompts and agent responses/actions) in a chat-like view.
*   Facilitate communication with the OpenHands backend server.

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

**Phase 3: Refinements & Testing (Future/Optional)**

1.  **Error Handling & Resilience:** Enhance robustness of error handling. (e.g., retry mechanisms, clearer user feedback for persistent failures).
    *   **Completed (Partial):** Implemented a client-side agent response timeout to notify users if the agent appears unresponsive.
2.  **UI/UX Enhancements:**
    *   Improve formatting for code blocks, markdown, and other rich content from the agent.
    *   Implement loading indicators or busy states more explicitly.
    *   Add functionality to clear conversation history or start a new conversation explicitly.
3.  **Configuration:** Make `_SERVER_URL` configurable via VS Code settings. **(Completed)**
4.  **License:** Address `package.json` license warning. **(Completed: "UNLICENSED" added)**
5.  **Thorough Testing:**
    *   Test with a live OpenHands server across various scenarios (complex prompts, server errors, disconnections, long messages).
    *   Test edge cases for UI and communication.
    *   Improve server/agent error reporting: Investigate how the extension can be made more aware of fatal errors or a non-responsive agent on the server-side, even if the basic socket connection remains active.
6.  **Documentation:** Create/update a `README.md` specifically for the extension within its directory.
7.  **Pull Request & Review:** (If this were part of a larger collaborative effort on `enyst/play`) Create a pull request from `experimental-extension` to a main development branch.

## 4. Current Stage

As of the last set of changes:

*   **Phase 1 (Basic Extension Setup & UI) is COMPLETE.**
*   **Phase 2 (Backend Communication - HTTP & Socket.IO) is LARGELY COMPLETE (Client-Side).**
    *   The extension successfully initiates conversations via HTTP, connects via Socket.IO, sends prompts, receives events, and updates the webview.
*   **Phase 3 (Refinements & Testing) - In Progress:**
    *   Server URL is now configurable via VS Code settings.
    *   `license` field ("UNLICENSED") added to `package.json`.
    *   A client-side agent response timeout has been implemented to provide feedback if the agent is unresponsive.
    *   The extension can be packaged into a `.vsix` file using `vsce package`.
*   **Key Remaining Challenges & Focus:**
    *   The primary challenge remains ensuring **OpenHands server-side agent stability** for reliable end-to-end interaction.
    *   **Thorough end-to-end testing** once the agent is stable.
    *   Further UI/UX enhancements (e.g., markdown rendering, loading indicators, clear conversation functionality).
    *   Improving server/agent error reporting and propagation to the extension.


## 5. Backend Details: Conversation Start & Metadata

This section outlines the backend process for initiating and managing conversations, with a focus on the creation and importance of `metadata.json`.

### 5.1. New Conversation Creation

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

### 5.2. Importance of `metadata.json`

*   The `metadata.json` file is critical. It stores the state and details of a conversation.
*   The backend expects this file to exist for any active or resumed conversation *before* most event processing occurs, particularly for callbacks that update timestamps or other metadata fields.
*   If `metadata.json` is missing when a callback like `_update_conversation_for_event` attempts to read it, a `FileNotFoundError` will occur, typically halting further processing for that event and potentially destabilizing the session.

### 5.3. Conversation Restoration/Rejoining (Client Perspective)

*   When a client wishes to reconnect to an existing conversation, it typically uses a previously obtained `conversation_id` to establish a WebSocket connection directly (bypassing the `/api/conversations` POST request).
*   The backend, upon receiving a WebSocket connection with a `conversation_id`, will attempt to load the corresponding agent session and its `metadata.json`.

### 5.4. Recommendations for Client Robustness

*   **Ensure New Sessions Use `/api/conversations`:** Clients should always use the HTTP POST to `/api/conversations` to initiate truly new conversations. This ensures the backend correctly creates the `conversation_id` and its initial `metadata.json`.
*   **Handle Stale/Invalid `conversation_id`s:** A client might persist a `conversation_id` locally. If this ID becomes stale (e.g., its `metadata.json` was never created due to an interruption, or was deleted on the backend), attempts to rejoin this session will likely lead to errors (like the `FileNotFoundError` if an early event callback tries to access it).
    *   Clients should be prepared for errors when rejoining sessions.
    *   Providing a clear user action (e.g., a "Start New Conversation" button) is important. This allows users to abandon a problematic session ID and force the creation of a fresh session via the `/api/conversations` route.
    *   Optionally, if a client detects critical errors early when trying to use a persisted `conversation_id` (e.g., consistent failures to load session data or specific error messages from the backend), it could proactively clear the stale ID and guide the user towards starting a new conversation.

