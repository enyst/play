import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RecentConversationList from '../components/features/conversations/recent-conversation-list'; // Adjust path as needed

// Types based on backend models (should ideally be in a shared types folder)
interface ConversationInfo {
  conversation_id: string;
  title: string;
  last_updated_at: string; // ISO string
  created_at: string; // ISO string
  status: string;
  // Add any other fields that `RecentConversationListItem` might eventually use or expect
  // e.g., selected_repository, git_provider, trigger, num_connections, url, session_api_key
}

interface ConversationInfoResultSet {
  results: ConversationInfo[];
  next_page_id: string | null;
}

const RecentConversationsPage: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecentConversations = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // In a real app, the base URL would come from a config or env variable
        const response = await fetch('/api/conversations/recent');
        if (!response.ok) {
          // Attempt to read error message from response body
          let errorMsg = `Error: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorData.detail || errorMsg;
          } catch (e) {
            // Ignore if response body is not JSON or empty
          }
          throw new Error(errorMsg);
        }
        const data: ConversationInfoResultSet = await response.json();
        setConversations(data.results || []); // Ensure results is an array
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred.');
        }
        setConversations([]); // Clear conversations on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentConversations();
  }, []); // Empty dependency array to run only on mount

  const handleConversationClick = (conversationId: string) => {
    // Navigate to the correct conversation view route
    navigate(`/conversations/${conversationId}`);
  };

  const handleStartNewConversation = () => {
    // Navigate to the page responsible for starting a new conversation (now at /home)
    navigate('/home');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl text-neutral-300">Loading recent conversations...</p>
        {/* You could add a spinner component here */}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center px-4">
        <p className="text-xl text-red-500 mb-4">Error fetching conversations:</p>
        <p className="text-md text-neutral-400 bg-neutral-800 p-4 rounded">{error}</p>
        <button
          onClick={() => window.location.reload()} // Simple retry by reloading page
          className="mt-6 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded transition duration-150 ease-in-out"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-white">Recent Conversations</h1>
      <RecentConversationList
        conversations={conversations}
        onConversationClick={handleConversationClick}
        onStartNewConversation={handleStartNewConversation}
      />
    </div>
  );
};

export default RecentConversationsPage;
