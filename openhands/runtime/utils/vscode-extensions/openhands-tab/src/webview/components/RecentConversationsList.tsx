import React from 'react';
import RecentConversationsListItem from './RecentConversationsListItem';

// Placeholder type for conversation details (consistent with RecentConversationsListItem)
interface Conversation {
  id: string;
  title: string;
  lastUpdatedAt: string; // Assuming ISO string format
  snippet?: string; // Optional snippet
}

interface RecentConversationsListProps {
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
  onStartNewConversation: () => void;
}

const RecentConversationsList: React.FC<RecentConversationsListProps> = ({
  conversations,
  onSelectConversation,
  onStartNewConversation,
}) => {
  if (!conversations || conversations.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-[var(--vscode-descriptionForeground)] mb-4">No recent conversations.</p>
        <button
          onClick={onStartNewConversation}
          className="bg-[var(--vscode-button-background)] hover:bg-[var(--vscode-button-hoverBackground)] text-[var(--vscode-button-foreground)] font-semibold py-2 px-4 rounded transition-colors duration-150 ease-in-out focus:outline-[var(--vscode-focusBorder)]"
          aria-label="Start a new conversation"
        >
          Start New Conversation
        </button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--vscode-editorWidget-border)]">
      {conversations.map((conversation) => (
        <RecentConversationsListItem
          key={conversation.id}
          conversation={conversation}
          onSelectConversation={onSelectConversation}
        />
      ))}
    </div>
  );
};

export default RecentConversationsList;
