import React from 'react';
import RecentConversationListItem from './recent-conversation-list-item'; // Adjust path as needed
// import { ConversationInfo } from '#/services/query/use-get-conversations'; // Placeholder
// Re-defining for now, ideally imported from a shared types location or API client
interface ConversationInfo {
  conversation_id: string;
  title: string;
  last_updated_at: string;
}

interface RecentConversationListProps {
  conversations: ConversationInfo[];
  onConversationClick: (conversationId: string) => void;
  // Placeholder for navigation function or router hook
  onStartNewConversation: () => void;
}

const RecentConversationList: React.FC<RecentConversationListProps> = ({
  conversations,
  onConversationClick,
  onStartNewConversation,
}) => {
  if (!conversations || conversations.length === 0) {
    return (
      <div className="text-center py-10 px-4 text-neutral-400">
        <p className="mb-4 text-lg">No recent conversations found.</p>
        <button
          onClick={onStartNewConversation}
          className="bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded transition duration-150 ease-in-out"
          aria-label="Start a new conversation"
        >
          Start a new conversation
        </button>
        {/* Or a link:
        <a
          href="/new-conversation-placeholder" // Replace with actual route
          className="text-primary-400 hover:text-primary-300 underline"
        >
          Start a new conversation
        </a>
        */}
      </div>
    );
  }

  return (
    // Styling similar to TaskGroup's container div
    <div className="text-content-2">
      {/* Optional: Add a title like "Recent Conversations" if not provided by parent
      <h3 className="text-lg font-semibold mb-2 text-white">Recent Conversations</h3>
      */}
      <ul className="text-sm">
        {conversations.map((conversation) => (
          <RecentConversationListItem
            key={conversation.conversation_id}
            conversation={conversation}
            onClick={onConversationClick}
          />
        ))}
      </ul>
    </div>
  );
};

export default RecentConversationList;
