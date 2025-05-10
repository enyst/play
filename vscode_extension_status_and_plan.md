# VS Code OpenHands Tab Extension - Project Plan & Status

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
    *   Work within the `playground` repository.
    *   Target the `experimental-extension` branch for development.
2.  **Core Extension Files (`playground/openhands/runtime/utils/vscode-extensions/openhands-tab/`):**
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

1.  **Error Handling & Resilience:** Enhance robustness of error handling (e.g., retry mechanisms, clearer user feedback for persistent failures).
2.  **UI/UX Enhancements:**
    *   Improve formatting for code blocks, markdown, and other rich content from the agent.
    *   Implement loading indicators or busy states more explicitly.
    *   Add functionality to clear conversation history or start a new conversation explicitly.
3.  **Configuration:** Make `_SERVER_URL` configurable via VS Code settings.
4.  **License:** Address `package.json` license warning (e.g., add `UNLICENSED` or choose an open-source license and add a `LICENSE` file).
5.  **Thorough Testing:**
    *   Test with a live OpenHands server across various scenarios (complex prompts, server errors, disconnections, long messages).
    *   Test edge cases for UI and communication.
6.  **Documentation:** Create/update a `README.md` specifically for the extension within its directory.
7.  **Pull Request & Review:** (If this were part of a larger collaborative effort on `enyst/playground` or `enyst/play`) Create a pull request from `experimental-extension` to a main development branch.

## 4. Current Stage

As of the last set of changes:

*   **Phase 1 (Basic Extension Setup & UI) is COMPLETE.**
*   **Phase 2 (Backend Communication - HTTP & Socket.IO) is COMPLETE.**
    *   The extension successfully initiates conversations via HTTP.
    *   It connects via Socket.IO and handles sending user prompts (`oh_user_action`).
    *   It receives and processes `oh_event` messages from the agent.
    *   The webview is updated to display these communications.
*   The code has been committed to the `experimental-extension` branch.
*   This branch, along with `main`, has been pushed to the new `play` remote (`git@github.com:enyst/play.git`).

The extension is now functionally capable of basic interaction with the OpenHands backend. The immediate next steps would focus on **Phase 3: Refinements & Testing** if further development is desired.
