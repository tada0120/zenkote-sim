
import React, { useState, useEffect } from 'react';
import type { QuoteRetweet, UserProfile, Reply as ReplyType } from '../types'; // Renamed Reply to ReplyType to avoid conflict
import { RetweetIcon } from './icons/RetweetIcon';
import { HeartIcon } from './icons/HeartIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { ReplyItem } from './ReplyItem';
import { LoadingSpinner } from './LoadingSpinner';

// Re-using SubReplyInputForm logic, maybe move to a shared component later if identical
const SubReplyInputForm: React.FC<{
  onSubmit: (text: string) => void;
  userProfile: UserProfile;
  onCancel: () => void;
  placeholder?: string;
}> = ({ onSubmit, userProfile, onCancel, placeholder = "返信する..." }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 pl-16"> 
      <div className="flex items-start space-x-2">
        <img src={userProfile.avatarUrl} alt={userProfile.name} className="w-10 h-10 rounded-full flex-shrink-0 mt-1" />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="w-full p-2 text-base bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:text-gray-100 resize-none"
          rows={3}
          autoFocus
        />
      </div>
      <div className="flex justify-end space-x-2 mt-2">
        <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
        >
            キャンセル
        </button>
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-5 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-md disabled:opacity-50"
        >
          返信する
        </button>
      </div>
    </form>
  );
};


const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return `${diffSeconds}秒前`;
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays === 1) return '昨日';
  
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
};

interface QuoteRetweetItemProps {
  quoteRetweet: QuoteRetweet;
  mainUserProfile: UserProfile;
  onToggleDirectReplyInput: (quoteRetweetId: string) => void;
  onDirectReplySubmit: (quoteRetweetId: string, text: string) => void;
  onToggleSubReplyInput: (timelineItemId: string, replyId: string) => void; // For replies to replies
  onSubReplySubmit: (timelineItemId: string, parentReplyId: string, text: string) => void; // For replies to replies
}

export const QuoteRetweetItem: React.FC<QuoteRetweetItemProps> = ({ 
    quoteRetweet, 
    mainUserProfile,
    onToggleDirectReplyInput,
    onDirectReplySubmit,
    onToggleSubReplyInput,
    onSubReplySubmit
}) => {
  const [likes, setLikes] = useState(() => Math.floor(Math.random() * 20) + 5); // Keep random initial likes for QR for now or set to 0? For consistency, set to 0.
  const [reposts, setReposts] = useState(0);

  useEffect(() => {
    // Initial random likes for QR, or start from 0 and increment
     setLikes(0); // Start likes from 0 for quote retweets as well for consistency
    const likeInterval = setInterval(() => {
      setLikes(prevLikes => prevLikes + Math.floor(Math.random() * 2) +1); // ensure it increments
    }, (Math.random() * 5000) + 6000); 

    const repostInterval = setInterval(() => {
      setReposts(prevReposts => prevReposts + (Math.random() > 0.4 ? 1 : 0) +1); // ensure it increments if condition met
    }, (Math.random() * 8000) + 9000); 

    return () => {
      clearInterval(likeInterval);
      clearInterval(repostInterval);
    };
  }, []);

  const { user, text, timestamp, quotedPost, replies, allReplies, showDirectReplyInput } = quoteRetweet;

  const getTotalRepliesCount = (repliesToList: ReplyType[]): number => {
    let count = repliesToList.length;
    repliesToList.forEach(reply => {
      if (reply.children) {
        count += getTotalRepliesCount(reply.children);
      }
    });
    return count;
  };
  const totalRepliesForIcon = getTotalRepliesCount(allReplies || []);


  const handleDirectReplyInternalSubmit = (replyText: string) => {
    onDirectReplySubmit(quoteRetweet.id, replyText);
  };

  const handleCancelDirectReply = () => {
    onToggleDirectReplyInput(quoteRetweet.id);
  };


  return (
    <article className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-5 transition-colors duration-300">
      <div className="flex items-start space-x-4">
        <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap">
            <span className="font-bold text-gray-900 dark:text-gray-100">{user.name}</span>
            <span className="text-gray-500 dark:text-gray-400 text-sm">{user.username}</span>
            <span className="text-gray-500 dark:text-gray-400 text-sm hidden sm:inline">·</span>
            <span className="text-gray-500 dark:text-gray-400 text-sm hover:underline cursor-pointer" title={new Date(timestamp).toLocaleString('ja-JP')}>
              {formatTimestamp(timestamp)}
            </span>
          </div>
          <p className="mt-2 text-gray-800 dark:text-gray-200 whitespace-pre-wrap text-base">
            {text}
          </p>

          {/* Quoted Post Block */}
          <div className="mt-3 border border-gray-300 dark:border-gray-600 rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
            <div className="flex items-center space-x-2 mb-1">
              <img src={quotedPost.user.avatarUrl} alt={quotedPost.user.name} className="w-6 h-6 rounded-full" />
              <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{quotedPost.user.name}</span>
              <span className="text-gray-500 dark:text-gray-400 text-xs">{quotedPost.user.username}</span>
              <span className="text-gray-500 dark:text-gray-400 text-xs hidden sm:inline">·</span>
               <span className="text-gray-500 dark:text-gray-400 text-xs">
                {formatTimestamp(quotedPost.timestamp)}
              </span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
              {quotedPost.text.length > 150 ? `${quotedPost.text.substring(0, 147)}...` : quotedPost.text}
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pl-16 flex space-x-6 text-gray-500 dark:text-gray-400">
         <button 
            aria-label={`返信 ${totalRepliesForIcon}件`} 
            className="flex items-center space-x-1 hover:text-blue-500 dark:hover:text-blue-400 group"
            onClick={() => onToggleDirectReplyInput(quoteRetweet.id)}
        >
          <ChatBubbleIcon className="w-5 h-5 group-hover:fill-blue-100 dark:group-hover:fill-blue-800" /> 
          <span>{totalRepliesForIcon > 0 ? totalRepliesForIcon : ''}</span>
        </button>
        <button aria-label={`リポスト ${reposts}件`} className="flex items-center space-x-1 hover:text-green-500 dark:hover:text-green-400 group">
          <RetweetIcon className="w-5 h-5 group-hover:fill-green-100 dark:group-hover:fill-green-800" />
          <span>{reposts > 0 ? reposts : ''}</span>
        </button>
        <button aria-label={`いいね ${likes}件`} className="flex items-center space-x-1 hover:text-red-500 dark:hover:text-red-400 group">
          <HeartIcon className="w-5 h-5 group-hover:fill-red-100 dark:group-hover:fill-red-800" />
          <span>{likes > 0 ? likes : ''}</span>
        </button>
      </div>

      {/* Direct Reply Input Form for QuoteRetweet */}
      {showDirectReplyInput && (
        <SubReplyInputForm
          onSubmit={handleDirectReplyInternalSubmit}
          userProfile={mainUserProfile}
          onCancel={handleCancelDirectReply}
          placeholder="この引用リポストに返信する..."
        />
      )}
      
      {/* Replies to this QuoteRetweet */}
      {replies && replies.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 pl-16 space-y-4">
          {replies.map(reply => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              timelineItemId={quoteRetweet.id} // Pass quoteRetweet.id as timelineItemId
              onToggleReplyInput={onToggleSubReplyInput} // Use generalized handler
              onSubReplySubmit={onSubReplySubmit} // Use generalized handler
              mainUserProfile={mainUserProfile}
              indentationLevel={0} // Direct replies to QR are at level 0
            />
          ))}
        </div>
      )}
      {/* Add loading/error states for replies to QR if needed in future */}

    </article>
  );
};
