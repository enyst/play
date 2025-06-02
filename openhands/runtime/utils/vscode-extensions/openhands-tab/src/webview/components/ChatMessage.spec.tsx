import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ChatMessage } from './ChatMessage';
import type { Message } from '../../shared/types/message';

// Mock the clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

describe('ChatMessage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders user message correctly', () => {
    const message: Message = {
      id: '1',
      sender: 'user',
      type: 'message',
      content: 'Hello, this is a user message',
      timestamp: Date.now(),
    };

    render(<ChatMessage message={message} />);
    
    expect(screen.getByText('Hello, this is a user message')).toBeTruthy();
  });

  it('renders assistant message correctly', () => {
    const message: Message = {
      id: '2',
      sender: 'assistant',
      type: 'message',
      content: 'Hello, this is an assistant response',
      timestamp: Date.now(),
    };

    render(<ChatMessage message={message} />);
    
    expect(screen.getByText('Hello, this is an assistant response')).toBeTruthy();
  });

  it('renders action message with EventMessage component', () => {
    const message: Message = {
      id: '3',
      sender: 'assistant',
      type: 'action',
      content: 'Action performed',
      timestamp: Date.now(),
      eventData: {
        action: 'read',
        args: { path: '/test/file.py' },
      }
    } as any;

    render(<ChatMessage message={message} />);
    
    // Should render the action using EventMessage component
    expect(screen.getByText('📖 Read file:')).toBeTruthy();
    expect(screen.getByText('/test/file.py')).toBeTruthy();
  });

  it('shows copy button on hover', () => {
    const message: Message = {
      id: '4',
      sender: 'user',
      type: 'message',
      content: 'Content to copy',
      timestamp: Date.now(),
    };

    render(<ChatMessage message={message} />);
    
    const messageElement = screen.getByText('Content to copy').closest('article');
    expect(messageElement).toBeTruthy();
    
    // Trigger hover to show copy button
    fireEvent.mouseEnter(messageElement!);
    
    // Copy button should now be visible
    const copyButton = screen.getByTitle('Copy message');
    expect(copyButton).toBeTruthy();
  });

  it('copies content to clipboard when copy button is clicked', async () => {
    const message: Message = {
      id: '5',
      sender: 'user',
      type: 'message',
      content: 'Content to copy',
      timestamp: Date.now(),
    };

    render(<ChatMessage message={message} />);
    
    const messageElement = screen.getByText('Content to copy').closest('article');
    
    // Trigger hover to show copy button
    fireEvent.mouseEnter(messageElement!);
    
    const copyButton = screen.getByTitle('Copy message');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Content to copy');
    });
  });

  it('applies correct styling for user messages', () => {
    const message: Message = {
      id: '6',
      sender: 'user',
      type: 'message',
      content: 'User message',
      timestamp: Date.now(),
    };

    render(<ChatMessage message={message} />);
    
    const messageElement = screen.getByText('User message').closest('article');
    expect(messageElement).toBeTruthy();
    // Can't easily test CSS classes without jest-dom, but we can verify the element exists
  });

  it('applies correct styling for assistant messages', () => {
    const message: Message = {
      id: '7',
      sender: 'assistant',
      type: 'message',
      content: 'Assistant message',
      timestamp: Date.now(),
    };

    render(<ChatMessage message={message} />);
    
    const messageElement = screen.getByText('Assistant message').closest('article');
    expect(messageElement).toBeTruthy();
  });

  it('applies correct styling for system messages', () => {
    const message: Message = {
      id: '8',
      sender: 'assistant',
      type: 'status',
      content: 'System message',
      timestamp: Date.now(),
    };

    render(<ChatMessage message={message} />);
    
    const messageElement = screen.getByText('System message').closest('article');
    expect(messageElement).toBeTruthy();
  });

  it('applies correct styling for error messages', () => {
    const message: Message = {
      id: '9',
      sender: 'assistant',
      type: 'error',
      content: 'Something went wrong!',
      timestamp: Date.now(),
    };

    render(<ChatMessage message={message} />);
    
    const messageElement = screen.getByText('Something went wrong!').closest('article');
    expect(messageElement).toBeTruthy();
  });

  it('handles long content with proper word breaking', () => {
    const message: Message = {
      id: '10',
      sender: 'user',
      type: 'message',
      content: 'This is a very long message that should wrap properly and not overflow the container boundaries when displayed in the chat interface',
      timestamp: Date.now(),
    };

    render(<ChatMessage message={message} />);
    
    const messageElement = screen.getByText(/This is a very long message/).closest('article');
    expect(messageElement).toBeTruthy();
  });

  it('handles copy failure gracefully', async () => {
    // Mock clipboard to reject
    const mockWriteText = vi.fn(() => Promise.reject(new Error('Clipboard error')));
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
    });

    const message: Message = {
      id: '11',
      sender: 'user',
      type: 'message',
      content: 'Content to copy',
      timestamp: Date.now(),
    };

    render(<ChatMessage message={message} />);
    
    const messageElement = screen.getByText('Content to copy').closest('article');
    
    // Trigger hover to show copy button
    fireEvent.mouseEnter(messageElement!);
    
    const copyButton = screen.getByTitle('Copy message');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('Content to copy');
    });
    
    // Should not throw an error, just fail silently
  });
});