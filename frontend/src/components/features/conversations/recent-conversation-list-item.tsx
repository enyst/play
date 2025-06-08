import React from 'react';
import { cn } from '#/utils/utils'; // Assuming this utility is available

// Placeholder for ConversationInfo type - adjust as per actual backend definition
// We'll get this from #/services/query/use-get-conversations eventually
interface ConversationInfo {
  conversation_id: string;
  title: string;
  last_updated_at: string; // ISO string format
  // Add other relevant fields if needed, e.g., status, trigger, etc.
}

interface RecentConversationListItemProps {
  conversation: ConversationInfo;
  onClick: (conversationId: string) => void; // Function to handle click
}

const RecentConversationListItem: React.FC<RecentConversationListItemProps> = ({
  conversation,
  onClick,
}) => {
  const { title, last_updated_at, conversation_id } = conversation;

  // Basic date formatting (can be improved with a library like date-fns)
  const formattedDate = new Date(last_updated_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Placeholder for snippet - for now, let's use a truncated title or a static message
  const snippet = title.length > 100 ? `${title.substring(0, 97)}...` : title;
  // Or a static placeholder: const snippet = "Initial message snippet will be shown here...";

  return (
    <li
      className="py-3 border-b border-neutral-700 flex items-center pr-6 hover:bg-neutral-800 cursor-pointer"
      onClick={() => onClick(conversation_id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick(conversation_id);
        }
      }}
      aria-label={`Select conversation: ${title}`}
    >
      {/* Icon placeholder - similar to TaskIssueNumber if we want an icon */}
      {/* <div className="px-4">
        <BriefcaseIcon className="h-6 w-6 text-neutral-400" />
      </div> */}

      <div className="w-full pl-4"> {/* Adjusted padding from pl-8 to pl-4 if no icon */}
        <p className="font-semibold text-base text-white">{title}</p>
        <p className="text-xs text-neutral-400 mt-1">
          Last updated: {formattedDate}
        </p>
        {/* Snippet placeholder */}
        <p className="text-sm text-neutral-300 mt-2 italic">
          {snippet} (Snippet placeholder)
        </p>
      </div>

      {/* Optional: Could add a small chevron or indicator for clickability */}
      {/* <ChevronRightIcon className="h-5 w-5 text-neutral-500" /> */}
    </li>
  );
};

export default RecentConversationListItem;

// Example of how to import an icon if needed, e.g., from heroicons
// import { BriefcaseIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
