
import React, { useState, useEffect } from 'react';
import type { Reply, UserProfile } from '../types';
import { HeartIcon } from './icons/HeartIcon';
import { LoadingSpinner } from './LoadingSpinner'; 
import { ChatBubbleIcon } from './icons/ChatBubbleIcon'; 

interface ReplyItemProps {
  reply: Reply;
  timelineItemId: string; // Changed from postId to timelineItemId
  onToggleReplyInput: (timelineItemId: string, replyId: string) => void;
  onSubReplySubmit: (timelineItemId: string, parentReplyId: string, text: string) => void;
  mainUserProfile: UserProfile; 
  indentationLevel: number;
}

const SubReplyInputForm: React.FC<{
  onSubmit: (text: string) => void;
  userProfile: UserProfile;
  onCancel: () => void;
}> = ({ onSubmit, userProfile, onCancel }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 ml-10"> 
      <div className="flex items-start space-x-2">
        <img src={userProfile.avatarUrl} alt={userProfile.name} className="w-8 h-8 rounded-full flex-shrink-0 mt-1" />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="返信する..."
          className="w-full p-2 text-sm bg-gray-50 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:text-gray-100 resize-none"
          rows={2}
          autoFocus
        />
      </div>
      <div className="flex justify-end space-x-2 mt-2">
        <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
        >
            キャンセル
        </button>
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-4 py-1 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-md disabled:opacity-50"
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

  if (diffSeconds < 60) return `${diffSeconds}秒前`;
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  
  return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
};

export const ReplyItem: React.FC<ReplyItemProps> = ({ reply, timelineItemId, onToggleReplyInput, onSubReplySubmit, mainUserProfile, indentationLevel }) => {
  const [likes, setLikes] = useState(reply.likes !== undefined ? reply.likes : 0);

  useEffect(() => {
    if (reply.likes !== undefined && reply.likes !== likes) {
       setLikes(reply.likes);
    }
  }, [reply.likes]);


  useEffect(() => {
    const minInterval = indentationLevel > 0 ? 8000 : 6000; 
    const maxInterval = indentationLevel > 0 ? 15000 : 10000;
    const interval = setInterval(() => {
      setLikes(prevLikes => prevLikes + (Math.random() < 0.7 ? 1 : 0)); 
    }, (Math.random() * (maxInterval - minInterval)) + minInterval);

    return () => clearInterval(interval);
  }, [indentationLevel]);
  
  const handleReplyButtonClick = () => {
    onToggleReplyInput(timelineItemId, reply.id);
  };

  const handleSubReplyInternalSubmit = (text: string) => {
    onSubReplySubmit(timelineItemId, reply.id, text);
  };
  
  const handleCancelSubReply = () => {
     onToggleReplyInput(timelineItemId, reply.id); 
  };


  return (
    <div className={`mt-3 ${indentationLevel > 0 ? 'ml-6 sm:ml-10' : ''}`}> 
      <div className="flex items-start space-x-2 sm:space-x-3">
        <img src={reply.user.avatarUrl} alt={reply.user.name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 bg-gray-100 dark:bg-gray-700 p-2 sm:p-3 rounded-lg shadow">
          <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap">
            <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm sm:text-base">{reply.user.name}</span>
            <span className="text-gray-500 dark:text-gray-400 text-xs">{reply.user.username}</span>
            <span className="text-gray-500 dark:text-gray-400 text-xs hidden sm:inline">·</span>
            <span className="text-gray-500 dark:text-gray-400 text-xs hover:underline cursor-pointer" title={new Date(reply.timestamp).toLocaleString('ja-JP')}>
              {formatTimestamp(reply.timestamp)}
            </span>
          </div>
          <p className="mt-1 text-gray-700 dark:text-gray-200 text-sm whitespace-pre-wrap">
            {reply.text}
          </p>
          <div className="mt-2 flex items-center space-x-4 text-gray-500 dark:text-gray-400">
              <button 
                aria-label="いいね" 
                className="flex items-center space-x-1 text-xs hover:text-red-500 dark:hover:text-red-400 group"
                onClick={() => setLikes(l => l +1)} 
              >
                  <HeartIcon className="w-4 h-4 group-hover:fill-red-100 dark:group-hover:fill-red-800" />
                  <span>{likes}</span>
              </button>
              <button 
                onClick={handleReplyButtonClick}
                aria-label="このリプライに返信する" 
                className="flex items-center space-x-1 text-xs hover:text-blue-500 dark:hover:text-blue-400 group"
              >
                  <ChatBubbleIcon className="w-4 h-4 group-hover:fill-blue-100 dark:group-hover:fill-blue-800" />
                  <span>返信</span>
              </button>
          </div>
        </div>
      </div>

      {reply.showReplyInput && (
        <SubReplyInputForm 
            onSubmit={handleSubReplyInternalSubmit} 
            userProfile={mainUserProfile}
            onCancel={handleCancelSubReply}
        />
      )}

      {reply.isGeneratingChildren && (
        <div className="ml-10 mt-2 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
          <LoadingSpinner className="w-4 h-4" />
          <span>返信を待っています… <span role="img" aria-label="考え中">⏳</span></span>
        </div>
      )}
      {reply.errorGeneratingChildren && (
         <div className="ml-10 mt-2 text-xs text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-800 p-2 rounded-md">
            <p><strong><span role="img" aria-label="エラー">⚠️</span></strong> {reply.errorGeneratingChildren}</p>
        </div>
      )}

      {reply.children && reply.children.length > 0 && (
        <div className="mt-1"> 
          {reply.children.map(childReply => (
            <ReplyItem
              key={childReply.id}
              reply={childReply}
              timelineItemId={timelineItemId} // Pass down the same timelineItemId
              onToggleReplyInput={onToggleReplyInput}
              onSubReplySubmit={onSubReplySubmit}
              mainUserProfile={mainUserProfile}
              indentationLevel={indentationLevel + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};