
import React from 'react';
import type { TimelineItem, UserProfile, Post, QuoteRetweet } from '../types';
import { PostItem } from './PostItem';
import { QuoteRetweetItem } from './QuoteRetweetItem'; 

interface PostFeedProps {
  timelineItems: TimelineItem[];
  onToggleReplyInput: (timelineItemId: string, replyId: string) => void;
  onSubReplySubmit: (timelineItemId: string, parentReplyId: string, text: string) => void;
  onLoadMoreReplies: (timelineItemId: string) => void; // For Posts' initial replies
  
  onToggleDirectReplyInputForQuoteRetweet: (quoteRetweetId: string) => void;
  onDirectReplyToQuoteRetweetSubmit: (quoteRetweetId: string, text: string) => void;
  
  mainUserProfile: UserProfile;
}

export const PostFeed: React.FC<PostFeedProps> = ({ 
  timelineItems, 
  onToggleReplyInput, 
  onSubReplySubmit, 
  onLoadMoreReplies,
  onToggleDirectReplyInputForQuoteRetweet,
  onDirectReplyToQuoteRetweetSubmit,
  mainUserProfile 
}) => {
  if (timelineItems.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-10">
        <p className="text-xl">まだ投稿がありません。</p>
        <p className="text-lg mt-2">最初の投稿で、ポジティブな言葉を共有しましょう！✨</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {timelineItems.map(item => {
        if (item.type === 'post') {
          return (
            <PostItem 
              key={item.id} 
              post={item as Post} 
              onToggleReplyInput={onToggleReplyInput} // Pass timelineItemId (post.id)
              onSubReplySubmit={onSubReplySubmit}   // Pass timelineItemId (post.id)
              onLoadMoreReplies={onLoadMoreReplies} // Pass timelineItemId (post.id)
              mainUserProfile={mainUserProfile}
            />
          );
        } else if (item.type === 'quoteRetweet') {
          return (
            <QuoteRetweetItem 
              key={item.id} 
              quoteRetweet={item as QuoteRetweet} 
              mainUserProfile={mainUserProfile}
              onToggleDirectReplyInput={onToggleDirectReplyInputForQuoteRetweet}
              onDirectReplySubmit={onDirectReplyToQuoteRetweetSubmit}
              onToggleSubReplyInput={onToggleReplyInput} // Pass timelineItemId (quoteRetweet.id)
              onSubReplySubmit={onSubReplySubmit}     // Pass timelineItemId (quoteRetweet.id)
            />
          );
        }
        return null; 
      })}
    </div>
  );
};