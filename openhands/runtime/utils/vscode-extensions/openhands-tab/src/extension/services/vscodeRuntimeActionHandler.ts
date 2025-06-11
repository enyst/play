import * as vscode from 'vscode';
import { Socket } from 'socket.io-client';
import { OpenHandsEvent } from '../../shared/types'; // Assuming types are shared

// Define the structure of an Action received from the backend
// Based on VsCodeRuntime.md, actions are wrapped in an oh_event
// oh_event.action = 'run', 'read', 'write', etc.
// oh_event.args = { command: 'ls -l', path: '/file.txt', content: '...', ... }
// oh_event.id = 'delegated_action_event_123'

interface DelegatedActionArgs {
  command?: string;
  path?: string;
  content?: string;
  thought?: string;
  // Other potential args
}

interface DelegatedActionOhEvent {
  id: string; // ID of the event that carried the action
  action: string; // Type of action, e.g., "run", "read", "write"
  args: DelegatedActionArgs;
  source?: string;
  message?: string;
  // We might need to define a more specific type for these incoming events
}

// Define the structure of an Observation to be sent back
// Based on VsCodeRuntime.md, observations are wrapped in a new oh_event
// new_oh_event.observation = 'run', 'read', 'write'
// new_oh_event.content = 'output of command', 'content of file', etc.
// new_oh_event.extras = { exit_code: 0, command: 'ls -l', path: '/file.txt' }
// new_oh_event.cause = 'delegated_action_event_123' (original event.id)

interface ObservationExtras {
  exit_code?: number;
  command?: string;
  path?: string;
  // Other potential extras
}

interface ObservationOhEventPayload {
  id: string; // New unique ID for this observation event
  observation: string; // Type of observation, matches original action type
  content: string;
  extras?: ObservationExtras;
  cause: string; // ID of the oh_event that initiated this action
  message: string;
  source: string; // e.g., "vscode_runtime_executor"
  timestamp: string;
}


export class VsCodeRuntimeActionHandler {
  private socket: Socket;
  private outputChannel: vscode.OutputChannel;

  constructor(socket: Socket) {
    this.socket = socket;
    this.outputChannel = vscode.window.createOutputChannel('OpenHands Runtime');
    this.log('VsCodeRuntimeActionHandler initialized.');
  }

  private log(message: string) {
    this.outputChannel.appendLine(`[RuntimeHandler] ${message}`);
    console.log(`[RuntimeHandler] ${message}`);
  }

  public async handleAction(event: DelegatedActionOhEvent): Promise<void> {
    this.log(`Received action event: ${event.action}, ID: ${event.id}`);
    let observationContent = '';
    let observationExtras: ObservationExtras = {};
    let observationMessage = '';

    try {
      switch (event.action) {
        case 'run': // Corresponds to CmdRunAction
          if (event.args.command) {
            this.log(`Executing command: ${event.args.command}`);
            const { output, exitCode } = await this.executeCommand(event.args.command);
            observationContent = output;
            observationExtras = { command: event.args.command, exit_code: exitCode };
            observationMessage = `Command '${event.args.command}' executed. Exit code: ${exitCode}`;
            this.log(observationMessage);
          } else {
            throw new Error('CmdRunAction: Missing command argument.');
          }
          break;

        case 'read': // Corresponds to FileReadAction
          if (event.args.path) {
            this.log(`Reading file: ${event.args.path}`);
            observationContent = await this.readFile(event.args.path);
            observationExtras = { path: event.args.path };
            observationMessage = `File '${event.args.path}' read successfully.`;
            this.log(observationMessage);
          } else {
            throw new Error('FileReadAction: Missing path argument.');
          }
          break;

        case 'write': // Corresponds to FileWriteAction
          if (event.args.path && typeof event.args.content === 'string') {
            this.log(`Writing to file: ${event.args.path}`);
            await this.writeFile(event.args.path, event.args.content);
            // For write, content of observation might be a status, or the written content itself.
            // VsCodeRuntime.md suggests content could be a status message.
            // The Python side FileWriteObservation expects path and content (which is often empty string for successful write obs)
            observationContent = `File '${event.args.path}' written successfully.`; // Or event.args.content if that's the convention
            observationExtras = { path: event.args.path };
            observationMessage = `File '${event.args.path}' written successfully.`;
            this.log(observationMessage);
          } else {
            throw new Error('FileWriteAction: Missing path or content argument.');
          }
          break;

        // TODO: Implement other actions like mkdir, rmdir, rm as needed
        // case 'mkdir':
        //   // ...
        //   break;

        default:
          throw new Error(`Unsupported action type: ${event.action}`);
      }
      this.sendObservation(event.id, event.action, observationContent, observationExtras, observationMessage, false);
    } catch (error: any) {
      this.log(`Error handling action ${event.action} (ID: ${event.id}): ${error.message}`);
      observationContent = `Error executing action '${event.action}': ${error.message}`;
      observationExtras = { ...event.args }; // Include original args for context
      observationMessage = `Failed to execute ${event.action}.`;
      this.sendObservation(event.id, event.action, observationContent, observationExtras, observationMessage, true);
    }
  }

  private async executeCommand(command: string): Promise<{ output: string; exitCode: number }> {
    // This is a simplified execution. A real implementation would need to handle:
    // - Finding/creating a persistent terminal.
    // - Streaming output.
    // - Handling ^C, ^D etc. if the backend runtime supports sending them.
    // For now, use a one-off terminal execution.
    return new Promise<{ output: string; exitCode: number }>((resolve) => {
      const term = vscode.window.createTerminal({ name: 'OpenHands Task', pty: undefined });
      term.sendText(command);
      term.sendText('echo $?'); // To get exit code, simplistic

      let output = '';
      const onDataDisposable = (term as any).onDidWriteData((data: string) => {
        output += data;
      });

      // This is a very naive way to get exit code and determine command completion.
      // A robust solution would use VS Code's proposed Terminal PTY API more deeply
      // or other mechanisms to track process completion and exit codes.
      // This timeout is a fallback.
      const MAX_EXECUTION_TIME = 30000; // 30 seconds
      let resolved = false;

      const resolveWithCode = (code: number) => {
        if (resolved) return;
        resolved = true;
        onDataDisposable.dispose();
        // Try to clean up the output to get the actual command output and exit code
        const lines = output.trim().split('\n');
        let exitCode = code;
        let cmdOutput = output;

        if (lines.length > 1) {
            const lastLine = lines[lines.length - 1].trim();
            const secondLastLine = lines[lines.length - 2].trim();
            // Check if the last line is the echo $? output
            if (secondLastLine.endsWith(command) && !isNaN(parseInt(lastLine,10))) {
                 exitCode = parseInt(lastLine, 10);
                 cmdOutput = lines.slice(0, -1).join('\n'); // Naive removal of echo $? and its output
            } else if (lastLine.endsWith(command) && lines.length > 0 && !isNaN(parseInt(lines[lines.length-1].trim(),10))) {
                 // if command itself was echo $?
                 exitCode = parseInt(lines[lines.length-1].trim(), 10);
                 cmdOutput = lines.slice(0, -1).join('\n');
            }
        }

        term.dispose();
        resolve({ output: cmdOutput, exitCode });
      };


      const closeDisposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
        if (closedTerminal === term) {
          this.log('Terminal closed for command: ' + command);
          closeDisposable.dispose();
          // If closed before explicit exit code, assume error or interruption
          resolveWithCode(-1); // Or a specific code for premature close
        }
      });

      // Fallback timeout
      setTimeout(() => {
        if (!resolved) {
          this.log(`Command execution timeout for: ${command}`);
          resolveWithCode(-2); // Indicate timeout
        }
      }, MAX_EXECUTION_TIME);

      // Attempt to detect command completion by sending an exit command
      // This is still not foolproof for all types of commands.
      // A more robust solution would involve a custom PTY or more advanced terminal interaction.
      term.show();
      // After sending the command, send an exit to close the terminal,
      // which then triggers the onDidCloseTerminal event.
      // This is a common pattern but might not work for interactive/long-running commands
      // without further logic to detect their specific completion.
      // For now, we rely on the echo $? and a timeout.
      // A short delay before sending exit, to allow the original command to run.
      // This is still very hacky.
      // setTimeout(() => term.sendText('exit'), 1000);
    });
  }

  private async readFile(path: string): Promise<string> {
    const fileUri = vscode.Uri.file(path); // Assuming absolute path
    try {
      const contentBytes = await vscode.workspace.fs.readFile(fileUri);
      return new TextDecoder().decode(contentBytes);
    } catch (error: any) {
      this.log(`Error reading file ${path}: ${error.message}`);
      throw new Error(`Failed to read file '${path}': ${error.message}`);
    }
  }

  private async writeFile(path: string, content: string): Promise<void> {
    const fileUri = vscode.Uri.file(path); // Assuming absolute path
    try {
      const contentBytes = new TextEncoder().encode(content);
      await vscode.workspace.fs.writeFile(fileUri, contentBytes);
    } catch (error: any) {
      this.log(`Error writing file ${path}: ${error.message}`);
      throw new Error(`Failed to write file '${path}': ${error.message}`);
    }
  }

  private sendObservation(
    causeEventId: string,
    actionType: string, // This should be the observation type, matching the action
    content: string,
    extras: ObservationExtras,
    message: string,
    isError: boolean = false
  ): void {
    const observationType = actionType; // e.g., "run" for CmdRunAction -> CmdOutputObservation

    const observationPayload: ObservationOhEventPayload = {
      id: `obs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // Unique ID for this observation event
      observation: observationType,
      content: content,
      extras: extras,
      cause: causeEventId, // Link back to the action event
      message: message,
      source: 'vscode_runtime_executor',
      timestamp: new Date().toISOString(),
    };

    if (isError) {
      // If it's an error observation, the Python side expects ErrorObservation
      // which has 'error' and 'content' fields.
      // The 'observation' field in oh_event should reflect the original action type
      // or be a generic 'error' type if the Python side handles that.
      // For now, let's assume the Python side's handle_observation_from_vscode
      // can create an ErrorObservation if the content indicates an error,
      // or we can refine this to send a specific 'error' observation type.
      // Based on VsCodeRuntime.md, the python side reconstructs specific observations.
      // If an error occurred, the content field should contain the error message.
      // The python side's ErrorObservation takes `content`.
      // Let's stick to the original observationType and let content carry the error.
      this.log(`Sending ERROR observation for ${actionType} (cause: ${causeEventId}): ${content}`);
    } else {
      this.log(`Sending observation for ${actionType} (cause: ${causeEventId})`);
    }
    this.log(`Observation payload: ${JSON.stringify(observationPayload)}`);

    // Emit this back to the OpenHands backend via Socket.IO
    // The event name 'oh_event' is assumed based on VsCodeRuntime.md
    this.socket.emit('oh_event', observationPayload);
  }
}

// Helper to generate a more UUID-like string if needed, though not strictly required by spec
// function generateEventId(): string {
//   return 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
// }
