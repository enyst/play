import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { StatusBar } from './StatusBar';

describe('StatusBar Component', () => {
  const mockOnStartNewConversation = vi.fn();
  const mockOnCheckHealth = vi.fn();

  const defaultProps = {
    isConnected: true,
    error: null,
    serverHealthy: true,
    onStartNewConversation: mockOnStartNewConversation,
    onCheckHealth: mockOnCheckHealth,
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });


  it('should render "Connected" when isConnected is true', () => {
    render(<StatusBar {...defaultProps} isConnected={true} />);
    expect(screen.getByText('Connected')).toBeTruthy();
  });

  it('should render "Disconnected" when isConnected is false', () => {
    render(<StatusBar {...defaultProps} isConnected={false} />);
    expect(screen.getByText('Disconnected')).toBeTruthy();
  });

  it('should render server health as "Server OK" when serverHealthy is true', () => {
    render(<StatusBar {...defaultProps} serverHealthy={true} />);
    expect(screen.getByText('Server OK')).toBeTruthy();
  });

  it('should render server health as "Server Down" when serverHealthy is false', () => {
    render(<StatusBar {...defaultProps} serverHealthy={false} />);
    expect(screen.getByText('Server Down')).toBeTruthy();
  });

  it('should render server health as "Checking..." when serverHealthy is null', () => {
    render(<StatusBar {...defaultProps} serverHealthy={null} />);
    expect(screen.getByText('Checking...')).toBeTruthy();
  });

  it('should display an error message when error prop is provided', () => {
    const errorMessage = 'Network Error';
    render(<StatusBar {...defaultProps} error={errorMessage} />);
    expect(screen.getByText(errorMessage)).toBeTruthy();
    expect(screen.getByText('⚠️')).toBeTruthy(); // Check for error icon
  });

  it('should not display an error message when error prop is null', () => {
    render(<StatusBar {...defaultProps} error={null} />);
    expect(screen.queryByText('⚠️')).toBeNull();
  });

  it('should call onStartNewConversation when "New Chat" button is clicked', () => {
    render(<StatusBar {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /new chat/i }));
    expect(mockOnStartNewConversation).toHaveBeenCalledTimes(1);
  });

  it('should call onCheckHealth when "Health" button is clicked', () => {
    render(<StatusBar {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /health/i }));
    expect(mockOnCheckHealth).toHaveBeenCalledTimes(1);
  });
});
