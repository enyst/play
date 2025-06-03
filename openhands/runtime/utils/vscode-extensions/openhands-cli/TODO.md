# OpenHands CLI VS Code Extension PoC - TODO

## Phase 1: Modify the OpenHands CLI (`openhands.cli.main`)
- [x] Integrate a FastAPI server that starts with the CLI.
- [x] This server will expose an SSE (Server-Sent Events) endpoint (e.g., `/stream`).
- [x] The existing event system in the CLI (`runtime.event_stream`) will be used to publish events, and our new SSE endpoint will subscribe to these events and send them to connected clients (like our VS Code extension).
- [x] Add a command-line argument to the CLI (e.g., `--sse-port`) to specify the port for this SSE server.

## Phase 2: Create the VS Code Extension PoC
- [ ] Create the basic structure for the VS Code extension in `/Users/enyst/repos/play/openhands/runtime/utils/vscode-extensions/openhands-cli`.
- [ ] The extension will:
    - [ ] Provide a command (e.g., "Start OpenHands CLI Session").
    - [ ] When triggered, it will spawn the `openhands` CLI process, passing the `--sse-port` argument.
    - [ ] Connect to the CLI's SSE endpoint (`http://localhost:<port>/stream`).
    - [ ] Listen for events and, for this PoC, log them to the VS Code debug console or display them as simple notifications.
