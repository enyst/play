import * as vscode from 'vscode';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import EventSource from 'eventsource'; // Import EventSource

let outputChannel: vscode.OutputChannel;
let cliProcess: ChildProcessWithoutNullStreams | null = null;
let eventSource: EventSource | null = null;

const OPENHANDS_CLI_PATH = '/Users/enyst/repos/play/openhands/cli/main.py';
const SSE_PORT = 10101;
const SSE_URL = `http://localhost:${SSE_PORT}/stream`;

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('OpenHands CLI');
    outputChannel.appendLine('OpenHands CLI extension is now active.');

    let startSessionDisposable = vscode.commands.registerCommand('openhands-cli.startSession', () => {
        outputChannel.appendLine('Attempting to start OpenHands CLI session...');
        vscode.window.showInformationMessage('OpenHands CLI: Starting session...');

        if (cliProcess) {
            outputChannel.appendLine('OpenHands CLI process is already running.');
            vscode.window.showWarningMessage('OpenHands CLI session is already active.');
            outputChannel.show();
            return;
        }

        try {
            cliProcess = spawn('python', [OPENHANDS_CLI_PATH, '--sse-port', String(SSE_PORT)]);
            outputChannel.appendLine(`Spawned OpenHands CLI (PID: ${cliProcess.pid}) with --sse-port ${SSE_PORT}`);

            cliProcess.stdout.on('data', (data: Buffer) => {
                outputChannel.appendLine(`CLI STDOUT: ${data.toString().trim()}`);
            });

            cliProcess.stderr.on('data', (data: Buffer) => {
                outputChannel.appendLine(`CLI STDERR: ${data.toString().trim()}`);
            });

            cliProcess.on('error', (error: Error) => {
                outputChannel.appendLine(`CLI Error: ${error.message}`);
                vscode.window.showErrorMessage(`Failed to start OpenHands CLI: ${error.message}`);
                if (eventSource) {
                    eventSource.close();
                    eventSource = null;
                }
                cliProcess = null;
            });

            cliProcess.on('close', (code: number) => {
                outputChannel.appendLine(`OpenHands CLI process exited with code ${code}`);
                if (code !== 0 && code !== null) {
                    vscode.window.showWarningMessage(`OpenHands CLI exited with code: ${code}. Check output for details.`);
                }
                if (eventSource) {
                    eventSource.close();
                    eventSource = null;
                }
                cliProcess = null;
            });

            // Attempt to connect to SSE after a short delay
            setTimeout(() => {
                if (!cliProcess) { // Check if CLI died before timeout
                    outputChannel.appendLine('CLI process terminated before SSE connection attempt.');
                    return;
                }
                outputChannel.appendLine(`Attempting to connect to SSE endpoint: ${SSE_URL}`);
                eventSource = new EventSource(SSE_URL);

                eventSource.onopen = () => {
                    outputChannel.appendLine('SSE connection established.');
                    vscode.window.showInformationMessage('OpenHands CLI: SSE connection established.');
                };

                eventSource.onmessage = (event) => {
                    outputChannel.appendLine(`SSE Message: ${event.data}`);
                    // FIXME: For PoC, just log. Later, this could be parsed and displayed.
                };

                eventSource.onerror = (error) => {
                    outputChannel.appendLine(`SSE Error: ${JSON.stringify(error)}`);
                    if (eventSource && eventSource.readyState === EventSource.CLOSED) {
                        outputChannel.appendLine('SSE connection closed due to error.');
                        // Avoid spamming user with messages if server isn't up yet or closes.
                        // vscode.window.showWarningMessage('OpenHands CLI: SSE connection lost.');
                        eventSource.close();
                        eventSource = null;
                    }
                };
            }, 3000); // 3-second delay to allow CLI's SSE server to start

            outputChannel.show();

        } catch (error: any) {
            outputChannel.appendLine(`Error spawning OpenHands CLI: ${error.message}`);
            vscode.window.showErrorMessage(`Error spawning OpenHands CLI: ${error.message}`);
            cliProcess = null;
        }
    });

    context.subscriptions.push(startSessionDisposable);
    context.subscriptions.push(outputChannel);
    context.subscriptions.push(new vscode.Disposable(() => {
        if (eventSource) {
            outputChannel.appendLine('Deactivating extension: Closing SSE connection.');
            eventSource.close();
            eventSource = null;
        }
        if (cliProcess) {
            outputChannel.appendLine('Deactivating extension: Killing OpenHands CLI process.');
            cliProcess.kill();
            cliProcess = null;
        }
    }));
}

export function deactivate() {
    if (eventSource) {
        outputChannel.appendLine('OpenHands CLI extension deactivating: Closing SSE connection.');
        eventSource.close();
        eventSource = null;
    }
    if (cliProcess) {
        outputChannel.appendLine('OpenHands CLI extension deactivating: Killing CLI process.');
        cliProcess.kill();
        cliProcess = null;
    }
    if (outputChannel) {
        outputChannel.dispose();
    }
}
