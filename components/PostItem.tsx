
import React, { useState, useEffect } from 'react';
import type { Post, UserProfile, Reply } from '../types'; 
import { ReplyItem } from './ReplyItem';
import { LoadingSpinner } from './LoadingSpinner';
import { HeartIcon } from './icons/HeartIcon';
import { RetweetIcon } from './icons/RetweetIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';

interface PostItemProps {
  post: Post;
  onToggleReplyInput: (timelineItemId: string, replyId: string) => void;
  onSubReplySubmit: (timelineItemId: string, parentReplyId: string, text: string) => void;
  onLoadMoreReplies: (timelineItemId: string) => void; 
  mainUserProfile: UserProfile;
}

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


export const PostItem: React.FC<PostItemProps> = ({ post, onToggleReplyInput, onSubReplySubmit, onLoadMoreReplies, mainUserProfile }) => {
  const [likes, setLikes] = useState(0); 
  const [reposts, setReposts] = useState(0); 

  useEffect(() => {
    const likeInterval = setInterval(() => {
      setLikes(prevLikes => prevLikes + Math.floor(Math.random() * 3) + 1);
    }, (Math.random() * 3000) + 4000); 

    const repostInterval = setInterval(() => { 
      setReposts(prevReposts => prevReposts + Math.floor(Math.random() * 2) + 1);
    }, (Math.random() * 5000) + 7000); 

    return () => {
      clearInterval(likeInterval);
      clearInterval(repostInterval); 
    };
  }, []);

  const getTotalRepliesCount = (replies: Reply[]): number => {
    let count = replies.length;
    replies.forEach(reply => {
      if (reply.children) {
        count += getTotalRepliesCount(reply.children);
      }
    });
    return count;
  };
  const totalRepliesForIcon = getTotalRepliesCount(post.allReplies);


  return (
    <article className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-5 transition-colors duration-300">
      <div className="flex items-start space-x-4">
        <img src={post.user.avatarUrl} alt={post.user.name} className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap">
            <span className="font-bold text-gray-900 dark:text-gray-100">{post.user.name}</span>
            <span className="text-gray-500 dark:text-gray-400 text-sm">{post.user.username}</span>
            <span className="text-gray-500 dark:text-gray-400 text-sm hidden sm:inline">·</span>
            <span className="text-gray-500 dark:text-gray-400 text-sm hover:underline cursor-pointer" title={new Date(post.timestamp).toLocaleString('ja-JP')}>
              {formatTimestamp(post.timestamp)}
            </span>
          </div>
          <p className="mt-1 text-gray-800 dark:text-gray-200 whitespace-pre-wrap text-base">
            {post.text}
          </p>
        </div>
      </div>

      <div className="mt-4 pl-16 flex space-x-6 text-gray-500 dark:text-gray-400">
        <button aria-label={`返信 ${totalRepliesForIcon}件`} className="flex items-center space-x-1 hover:text-blue-500 dark:hover:text-blue-400 group">
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

      {post.isGeneratingReplies && (
        <div className="mt-4 pl-16 flex items-center space-x-2 text-gray-500 dark:text-gray-400">
          <LoadingSpinner className="w-5 h-5" />
          <span>みんなからのリアクションが届いています！ <span role="img" aria-label="わくわく">🤩</span></span>
        </div>
      )}
      {post.errorGeneratingReplies && (
         <div className="mt-4 pl-16 text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900 p-3 rounded-md">
            <p><strong><span role="img" aria-label="困った顔">😥</span> おっと！</strong> {post.errorGeneratingReplies}</p>
        </div>
      )}

      {post.replies.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 pl-16 space-y-4"> 
          {post.replies.map(reply => (
            <ReplyItem 
                key={reply.id} 
                reply={reply} 
                timelineItemId={post.id} // Use post.id as timelineItemId
                onToggleReplyInput={onToggleReplyInput}
                onSubReplySubmit={onSubReplySubmit}
                mainUserProfile={mainUserProfile}
                indentationLevel={0} 
            />
          ))}
        </div>
      )}

      {!post.isGeneratingReplies && !post.isGeneratingMoreReplies && post.allReplies.length > post.replies.length && (
         <div className="mt-4 pl-16 flex items-center space-x-2 text-gray-400 dark:text-gray-500 text-sm">
            <LoadingSpinner className="w-4 h-4" />
            <span>さらに返信が届いています...</span>
        </div>
      )}

      {post.isGeneratingMoreReplies && (
        <div className="mt-4 pl-16 flex items-center space-x-2 text-gray-500 dark:text-gray-400">
          <LoadingSpinner className="w-5 h-5" />
          <span>さらに多くのリアクションを取得中... <span role="img" aria-label="thinking">🤔</span></span>
        </div>
      )}

      {post.errorGeneratingMoreReplies && (
         <div className="mt-4 pl-16 text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900 p-3 rounded-md">
            <p><strong><span role="img" aria-label="困った顔">😥</span> おっと！</strong> {post.errorGeneratingMoreReplies}</p>
        </div>
      )}
      
      {post.canLoadMore && !post.isGeneratingReplies && !post.isGeneratingMoreReplies && post.replies.length === post.allReplies.length && post.allReplies.length > 0 && (
        <div className="mt-4 pl-16 text-center">
            <button
                onClick={() => onLoadMoreReplies(post.id)} // Use post.id as timelineItemId
                className="px-4 py-2 text-sm bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-200 hover:bg-primary-200 dark:hover:bg-primary-700 rounded-full font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
                aria-label="もっと返信を見る"
            >
                もっと返信を見る <span role="img" aria-label="eyes looking right">👀</span>
            </button>
        </div>
      )}
    </article>
  );
};
