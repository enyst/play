import { App } from './App';it('renders without crashing', () => {
  render(<App />);
  expect(screen.getByRole('main')).toBeTruthy();
});
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebviewMessage, StatusMessage } from '../../shared/types';

// Mock VSCode API
const mockPostMessage = vi.fn();
const mockVsCodeApi = {
  postMessage: mockPostMessage,
  setState: vi.fn(),
  getState: vi.fn(() => ({})),
};

(global as any).acquireVsCodeApi = () => mockVsCodeApi;

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeTruthy();
  });

  it('handles statusUpdate messages correctly', () => {
    render(<App />);
    
    // Simulate receiving a status update message
    const statusMessage: StatusMessage = {
      status_update: true,
      type: 'info',
      id: 'test-status-1',
      message: 'Setting up git hooks...',
    };

    const webviewMessage: WebviewMessage = {
      type: 'statusUpdate',
      data: statusMessage,
    };

    // Simulate message from extension
    window.dispatchEvent(new MessageEvent('message', {
      data: webviewMessage,
    }));

    // Check that status message appears in status bar
    expect(screen.getByText('Setting up git hooks...')).toBeTruthy();
  });

  it('does not display status updates in chat messages', () => {
    render(<App />);
    
    // Simulate receiving a status update message
    const statusMessage: StatusMessage = {
      status_update: true,
      type: 'info',
      id: 'test-status-2',
      message: 'Processing request...',
    };

    const webviewMessage: WebviewMessage = {
      type: 'statusUpdate',
      data: statusMessage,
    };

    // Simulate message from extension
    window.dispatchEvent(new MessageEvent('message', {
      data: webviewMessage,
    }));

    // Status should be in status bar, not in chat
    expect(screen.getByText('Processing request...')).toBeTruthy();
    
    // Check that it's not in the chat area by looking for chat-specific elements
    const chatMessages = screen.queryAllByTestId('chat-message');
    expect(chatMessages).toHaveLength(0);
  });

  it('handles regular agent responses in chat', () => {
    render(<App />);
    
    // Simulate receiving a regular agent response
    const agentEvent = {
      id: 'test-event-1',
      timestamp: '2024-01-01T00:00:00Z',
      source: 'agent',
      message: 'Hello, how can I help you?',
      type: 'message',
    };

    const webviewMessage: WebviewMessage = {
      type: 'agentResponse',
      data: agentEvent,
    };

    // Simulate message from extension
    window.dispatchEvent(new MessageEvent('message', {
      data: webviewMessage,
    }));

    // Check that regular message appears in chat
    expect(screen.getByText('Hello, how can I help you?')).toBeTruthy();
  });

  it('handles status messages separately from agent responses', () => {
    render(<App />);
    
    // Send a status update
    const statusMessage: StatusMessage = {
      status_update: true,
      type: 'info',
      id: 'status-1',
      message: 'Initializing...',
    };

    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'statusUpdate', data: statusMessage },
    }));

    // Send a regular agent response
    const agentEvent = {
      id: 'event-1',
      timestamp: '2024-01-01T00:00:00Z',
      source: 'agent',
      message: 'Task completed',
      type: 'message',
    };

    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'agentResponse', data: agentEvent },
    }));

    // Both should be visible but in different places
    expect(screen.getByText('Initializing...')).toBeTruthy();
    expect(screen.getByText('Task completed')).toBeTruthy();
  });
});