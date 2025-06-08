import React from 'react';

// Placeholder type for conversation details
interface Conversation {
  id: string;
  title: string;
  lastUpdatedAt: string; // Assuming ISO string format
  snippet?: string; // Optional snippet
}

interface RecentConversationsListItemProps {
  conversation: Conversation;
  onSelectConversation: (id: string) => void;
}

const RecentConversationsListItem: React.FC<RecentConversationsListItemProps> = ({
  conversation,
  onSelectConversation,
}) => {
  const { id, title, lastUpdatedAt, snippet } = conversation;

  // Basic date formatting (can be improved with a library like date-fns if available in this context)
  const formattedDate = new Date(lastUpdatedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const displaySnippet = snippet || 'No snippet available.';

  return (
    <div
      className="p-3 border-b border-[var(--vscode-editorWidget-border)] hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer text-[var(--vscode-editor-foreground)]"
      onClick={() => onSelectConversation(id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelectConversation(id);
        }
      }}
      aria-label={`Select conversation: ${title}`}
    >
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-base font-semibold truncate text-[var(--vscode-list-activeSelectionForeground)]" title={title}>
          {title}
        </h3>
      </div>
      <p className="text-xs text-[var(--vscode-descriptionForeground)] mb-2">
        Last updated: {formattedDate}
      </p>
      <p className="text-sm text-[var(--vscode-foreground)] opacity-75 italic">
        {displaySnippet} (Snippet placeholder)
      </p>
    </div>
  );
};

export default RecentConversationsListItem;
