import React, { useState } from 'react';
import type { UserProfile } from '../types';

interface PostInputProps {
  onPostSubmit: (text: string) => void;
  userProfile: UserProfile;
}

const MAX_POST_LENGTH = 280;

export const PostInput: React.FC<PostInputProps> = ({ onPostSubmit, userProfile }) => {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && text.length <= MAX_POST_LENGTH) {
      onPostSubmit(text);
      setText('');
    }
  };

  const currentLength = text.length;
  const charsLeft = MAX_POST_LENGTH - currentLength;
  
  let countColor = "text-gray-500 dark:text-gray-400";
  if (currentLength > MAX_POST_LENGTH * 0.9 && currentLength <= MAX_POST_LENGTH) {
    countColor = "text-yellow-500 dark:text-yellow-400";
  }
  if (currentLength > MAX_POST_LENGTH) { // Should not happen with maxLength, but good for styling
    countColor = "text-red-500 dark:text-red-400 font-semibold";
  }


  return (
    <div className="bg-white dark:bg-gray-800 p-4 shadow-lg rounded-xl mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex items-start space-x-3">
          <img src={userProfile.avatarUrl} alt={userProfile.name} className="w-12 h-12 rounded-full" />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(text.length > 0)}
            placeholder="いまどうしてる？"
            className="w-full p-3 text-lg bg-transparent border-b-2 border-gray-300 dark:border-gray-600 focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none resize-none transition-colors duration-200 dark:text-gray-100"
            rows={isFocused || text.length > 0 ? 3 : 1}
            aria-label="新しい投稿を入力"
            maxLength={MAX_POST_LENGTH}
          />
        </div>
        <div className="flex justify-between items-center mt-3">
          <span className={`text-sm ${countColor}`}>
            {currentLength}/{MAX_POST_LENGTH}
          </span>
          <button
            type="submit"
            disabled={!text.trim() || currentLength > MAX_POST_LENGTH}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            投稿する
          </button>
        </div>
      </form>
    </div>
  );
};