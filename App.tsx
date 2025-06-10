
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PostInput } from './components/PostInput';
import { PostFeed } from './components/PostFeed';
import { generatePositiveReplies, generateQuoteRetweetComment } from './services/geminiService';
import type { Post, UserProfile, Reply, GeneratedReply, TimelineItem, QuoteRetweet, GeneratedQuoteComment } from './types';

const MAX_INITIAL_REPLIES = 2;
const REPLY_REVEAL_INTERVAL_MIN = 2000;
const REPLY_REVEAL_INTERVAL_MAX = 5000;
const QUOTE_REPOST_DELAY_MIN = 7000; // 7 seconds
const QUOTE_REPOST_DELAY_MAX = 15000; // 15 seconds

const AI_AVATAR_SILHOUETTE_CHANCE = 0.4; // 40% chance for AI to use silhouette

const SILHOUETTE_COLORS = [
  '#a7f3d0', // light green
  '#fed7aa', // light orange
  '#d8b4fe', // light purple
  '#e5e7eb', // light gray (slate-200)
  '#fecaca', // light red (red-200)
  '#bfdbfe', // light blue (blue-200)
  '#fef08a', // light yellow (yellow-200)
  '#bae6fd', // sky-200
];
const MAIN_USER_AVATAR_BG_COLOR = '#93c5fd'; // Tailwind primary-300
const LS_MAIN_USER_NAME = 'zenKoteiMainUserName';
const LS_TIMELINE_ITEMS = 'zenKoteiTimelineItems_v1'; // localStorage key for timeline items

// Colors for rare AI characters
const TADASUMEN_AVATAR_BG_COLOR = '#ffedd5'; // Tailwind orange-100 (light orange, distinct from SILHOUETTE_COLORS)
const KENTA_NIISAN_AVATAR_BG_COLOR = '#fecdd3'; // Tailwind rose-200 (light pink/red, distinct)


// Rate Limiting Constants
const RATE_LIMIT_THRESHOLD = 10; // Max calls per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_BLOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes

const DAILY_API_CALL_LIMIT = 50; // Max calls per day
const LS_DAILY_CALL_COUNT = 'zenKoteiDailyCallCount';
const LS_LAST_CALL_DATE = 'zenKoteiLastCallDate';

// Post collapsing constants
const INITIAL_VISIBLE_POSTS = 5;
const POSTS_TO_LOAD_PER_CLICK = 5;


const generateSilhouetteAvatarDataUrl = (backgroundColor: string, iconColor: string = '#FFFFFF'): string => {
  const svg = `
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="24" fill="${backgroundColor}"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M24 12C20.6863 12 18 14.6863 18 18C18 21.3137 20.6863 24 24 24C27.3137 24 30 21.3137 30 18C30 14.6863 27.3137 12 24 12ZM16 30C16 26.6863 18.6863 24 22 24H26C29.3137 24 32 26.6863 32 30V34H16V30Z" fill="${iconColor}"/>
    </svg>
  `.trim();
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const getRandomAiAvatarUrl = (seed: string): string => {
  if (Math.random() < AI_AVATAR_SILHOUETTE_CHANCE) {
    const randomColorIndex = Math.floor(Math.random() * SILHOUETTE_COLORS.length);
    return generateSilhouetteAvatarDataUrl(SILHOUETTE_COLORS[randomColorIndex]);
  }
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/48/48`;
};


const findReplyRecursive = (replies: Reply[], replyId: string): Reply | undefined => {
  for (const reply of replies) {
    if (reply.id === replyId) {
      return reply;
    }
    if (reply.children) {
      const foundInChildren = findReplyRecursive(reply.children, replyId);
      if (foundInChildren) {
        return foundInChildren;
      }
    }
  }
  return undefined;
};

const findReplyInTimelineItem = (item: Post | QuoteRetweet | undefined, replyId: string): Reply | undefined => {
  if (!item || !item.allReplies) return undefined;
  return findReplyRecursive(item.allReplies, replyId);
};


const generateDisplayUsername = (displayName: string): string => {
  let base = "";
  const normalizedDisplayName = displayName.toLowerCase().replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));

  let derivedFromName = normalizedDisplayName.replace(/\s+/g, '_');
  derivedFromName = derivedFromName.replace(/[^a-z0-9_]/g, ''); 
  derivedFromName = derivedFromName.replace(/^_+|_+$/g, ''); 
  derivedFromName = derivedFromName.replace(/__+/g, '_'); 

  // Specific handling for rare character usernames if display name matches
  if (displayName === "ただすめん") return "@tadasumen";
  if (displayName === "ケンタ兄さん") return "@kenta_b";


  const useRandomStringBase = Math.random() < 0.5;

  if (!useRandomStringBase && derivedFromName.length >= 3 && derivedFromName.length <= 15) {
    base = derivedFromName;
  } else {
    const randomLength = Math.floor(Math.random() * (10 - 4 + 1)) + 4; 
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    let randomStr = '';
    for (let i = 0; i < randomLength; i++) {
      randomStr += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    base = randomStr;
  }
  
  if (base === '' || base === '_') { 
    base = 'user';
  }

  const maxBaseLength = 18; 
  base = base.substring(0, maxBaseLength);
  if (base.endsWith('_')) {
    base = base.substring(0, base.length - 1);
  }
  if (base === '' || base === '_') { 
    base = 'user';
  }

  const addNumericSuffix = Math.random() < 0.6; 
  let username = base;

  if (addNumericSuffix) {
    const randomNumberSuffix = `_${Math.floor(Math.random() * 900) + 100}`;
    const maxBaseLengthForNumeric = 15;
    username = base.substring(0, maxBaseLengthForNumeric) + randomNumberSuffix;
  } else {
     if (username.length < 4) {
        const randomLength = Math.floor(Math.random() * (8 - 4 + 1)) + 4;
        const characters = 'abcdefghijklmnopqrstuvwxyz';
        username = '';
        for (let i = 0; i < randomLength; i++) {
          username += characters.charAt(Math.floor(Math.random() * characters.length));
        }
     }
  }
  
  username = username.replace(/[^a-z0-9_]/g, '');
  username = username.replace(/^_+|_+$/g, '');
  username = username.replace(/__+/g, '_');
  if (username.length === 0 || username === '_') username = 'random_user';


  return `@${username.substring(0, 20)}`; 
};


const App: React.FC = () => {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [apiKeyStatus, setApiKeyStatus] = useState<string | null>(null);

  const [mainUserProfile, setMainUserProfile] = useState<UserProfile>({
    id: 'main-user',
    name: localStorage.getItem(LS_MAIN_USER_NAME) || 'ユーザー',
    username: '@you',
    avatarUrl: generateSilhouetteAvatarDataUrl(MAIN_USER_AVATAR_BG_COLOR),
  });
  const [nameInput, setNameInput] = useState<string>(mainUserProfile.name);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);


  // Rate Limiting State
  const [apiCallTimestamps, setApiCallTimestamps] = useState<number[]>([]);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitEndTime, setRateLimitEndTime] = useState<number | null>(null);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  
  // Daily Rate Limiting State
  const [dailyApiCallCount, setDailyApiCallCount] = useState<number>(0);
  const [isDailyLimitReached, setIsDailyLimitReached] = useState(false);

  // Post collapsing state
  const [visiblePostCount, setVisiblePostCount] = useState<number>(INITIAL_VISIBLE_POSTS);


  // Load timeline items from localStorage on initial mount
  useEffect(() => {
    try {
      const storedTimelineItems = localStorage.getItem(LS_TIMELINE_ITEMS);
      if (storedTimelineItems) {
        const parsedItems: TimelineItem[] = JSON.parse(storedTimelineItems);
        if (Array.isArray(parsedItems)) {
          // Additional validation can be done here if item structures might change
          // For now, assume structure is consistent or backward compatible
          setTimelineItems(parsedItems);
        } else {
          console.warn("Stored timeline items are not an array, ignoring.");
          localStorage.removeItem(LS_TIMELINE_ITEMS); // Clear invalid data
        }
      }
    } catch (error) {
      console.error("Failed to load or parse timeline items from localStorage:", error);
      localStorage.removeItem(LS_TIMELINE_ITEMS); // Clear potentially corrupted data
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Save timeline items to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(LS_TIMELINE_ITEMS, JSON.stringify(timelineItems));
    } catch (error) {
      console.error("Failed to save timeline items to localStorage:", error);
      // Potentially handle quota exceeded errors here if necessary
    }
  }, [timelineItems]);


  useEffect(() => {
    // Load and manage daily API call count from localStorage
    const storedDailyCount = localStorage.getItem(LS_DAILY_CALL_COUNT);
    const storedLastCallDate = localStorage.getItem(LS_LAST_CALL_DATE);
    const todayStr = new Date().toISOString().split('T')[0];

    if (storedLastCallDate === todayStr) {
      const count = parseInt(storedDailyCount || '0', 10);
      setDailyApiCallCount(count);
      if (count >= DAILY_API_CALL_LIMIT) {
        setIsDailyLimitReached(true);
        setRateLimitMessage(`1日のAPI利用上限 (${DAILY_API_CALL_LIMIT}回) に達しました。明日またお試しください。`);
      }
    } else {
      // It's a new day, reset daily count
      setDailyApiCallCount(0);
      localStorage.setItem(LS_DAILY_CALL_COUNT, '0');
      localStorage.setItem(LS_LAST_CALL_DATE, todayStr);
      setIsDailyLimitReached(false); // Ensure this is reset too
    }
  }, []);

  const handleNameInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNameInput(event.target.value);
  };

  const handleEditName = () => {
    setNameInput(mainUserProfile.name);
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    const newName = nameInput.trim() || 'ユーザー'; // Default if empty or only spaces
    if (newName.length > 20) {
        alert("名前は20文字以内で入力してください。"); // Simple validation
        return;
    }
    setMainUserProfile(prev => ({ ...prev, name: newName }));
    localStorage.setItem(LS_MAIN_USER_NAME, newName);
    setIsEditingName(false);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setNameInput(mainUserProfile.name); 
  };


  const checkAndManageRateLimit = useCallback((): { canProceed: boolean; message: string | null } => {
    setRateLimitMessage(null); // Clear previous messages

    if (isRateLimited) {
      if (rateLimitEndTime && Date.now() < rateLimitEndTime) {
        const timeLeft = Math.ceil((rateLimitEndTime - Date.now()) / (60 * 1000));
        const msg = `APIの利用が一時的に制限されています。約${timeLeft}分後に再試行してください。`;
        setRateLimitMessage(msg);
        return { canProceed: false, message: msg };
      } else {
        setIsRateLimited(false);
        setRateLimitEndTime(null);
        setApiCallTimestamps([]); 
      }
    }

    if (isDailyLimitReached) {
        const msg = `1日のAPI利用上限 (${DAILY_API_CALL_LIMIT}回) に達しました。明日またお試しください。`;
        setRateLimitMessage(msg);
        return { canProceed: false, message: msg };
    }
    if (dailyApiCallCount >= DAILY_API_CALL_LIMIT) {
        setIsDailyLimitReached(true);
        const msg = `1日のAPI利用上限 (${DAILY_API_CALL_LIMIT}回) に達しました。明日またお試しください。`;
        setRateLimitMessage(msg);
        localStorage.setItem(LS_DAILY_CALL_COUNT, dailyApiCallCount.toString());
        localStorage.setItem(LS_LAST_CALL_DATE, new Date().toISOString().split('T')[0]);
        return { canProceed: false, message: msg };
    }

    const now = Date.now();
    const recentTimestamps = apiCallTimestamps.filter(
      timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
    );

    if (recentTimestamps.length >= RATE_LIMIT_THRESHOLD) {
      setIsRateLimited(true);
      const newRateLimitEndTime = now + RATE_LIMIT_BLOCK_DURATION_MS;
      setRateLimitEndTime(newRateLimitEndTime);
      const timeLeft = Math.ceil(RATE_LIMIT_BLOCK_DURATION_MS / (60 * 1000));
      const msg = `APIリクエストが短期間に集中しました。約${timeLeft}分間、APIの利用が制限されます。`;
      setRateLimitMessage(msg);
      setApiCallTimestamps(recentTimestamps); 
      return { canProceed: false, message: msg };
    }

    return { canProceed: true, message: null };
  }, [apiCallTimestamps, isRateLimited, rateLimitEndTime, dailyApiCallCount, isDailyLimitReached]);

  const recordApiCall = useCallback(() => {
    const now = Date.now();
    const updatedTimestamps = apiCallTimestamps.filter(
      timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
    );
    setApiCallTimestamps([...updatedTimestamps, now]);

    const newDailyCount = dailyApiCallCount + 1;
    setDailyApiCallCount(newDailyCount);
    localStorage.setItem(LS_DAILY_CALL_COUNT, newDailyCount.toString());
    localStorage.setItem(LS_LAST_CALL_DATE, new Date().toISOString().split('T')[0]);

    if (newDailyCount >= DAILY_API_CALL_LIMIT) {
        setIsDailyLimitReached(true);
        setRateLimitMessage(`本日分のAPI利用上限 (${DAILY_API_CALL_LIMIT}回) に達しました。明日またお試しください。`);
    }
  }, [apiCallTimestamps, dailyApiCallCount]);

  const getRecentUserPostTexts = useCallback((): string[] => {
    return timelineItems
      .filter(item => item.type === 'post' && item.user.id === mainUserProfile.id)
      .slice(0, 2) 
      .map(item => (item as Post).text);
  }, [timelineItems, mainUserProfile.id]);


  const updateReplyInChildren = (replies: Reply[], targetReplyId: string, updateFn: (reply: Reply) => Reply): Reply[] => {
    return replies.map(reply => {
      if (reply.id === targetReplyId) {
        return updateFn(reply);
      }
      if (reply.children) {
        return { ...reply, children: updateReplyInChildren(reply.children, targetReplyId, updateFn) };
      }
      return reply;
    });
  };

  const handleToggleReplyInput = useCallback((timelineItemId: string, replyId: string) => {
    setTimelineItems(prevItems =>
      prevItems.map(item => {
        if (item.id === timelineItemId && (item.type === 'post' || item.type === 'quoteRetweet')) {
          const currentItem = item as Post | QuoteRetweet;
          const updateFn = (reply: Reply) => ({ ...reply, showReplyInput: !reply.showReplyInput });
          const newAllReplies = currentItem.allReplies ? updateReplyInChildren(currentItem.allReplies, replyId, updateFn) : [];
          const newReplies = currentItem.replies ? updateReplyInChildren(currentItem.replies, replyId, updateFn) : [];
          return { ...currentItem, allReplies: newAllReplies, replies: newReplies };
        }
        return item;
      })
    );
  }, []);

  const handleSubReplySubmit = useCallback(async (timelineItemId: string, parentReplyId: string, subReplyText: string) => {
    if (!subReplyText.trim()) return;

    const { canProceed, message: rateLimitMsg } = checkAndManageRateLimit();
    if (!canProceed) {
      setTimelineItems(prevItems => prevItems.map(item => {
        if (item.id === timelineItemId && (item.type === 'post' || item.type === 'quoteRetweet')) {
            const currentItem = item as Post | QuoteRetweet;
            const updateFn = (reply: Reply) => ({
                ...reply,
                isGeneratingChildren: false, 
                errorGeneratingChildren: rateLimitMsg || "APIの利用が一時的に制限されています。",
                showReplyInput: false, 
            });
            const newAllReplies = currentItem.allReplies ? updateReplyInChildren(currentItem.allReplies, parentReplyId, updateFn) : [];
            const newReplies = currentItem.replies ? updateReplyInChildren(currentItem.replies, parentReplyId, updateFn) : [];
            return { ...currentItem, allReplies: newAllReplies, replies: newReplies };
        }
        return item;
      }));
      return;
    }
    
    const currentTimelineItem = timelineItems.find(item => item.id === timelineItemId) as Post | QuoteRetweet | undefined;
    if (!currentTimelineItem) {
        console.error("親アイテムが見つかりません:", timelineItemId);
        return;
    }
    const parentReply = findReplyInTimelineItem(currentTimelineItem, parentReplyId);

    if (!parentReply) {
      console.error("親返信が見つかりません:", parentReplyId);
      return;
    }
    
    const isAIReplyingToMainUser = parentReply.user.id !== mainUserProfile.id;
    const pastUserPostsForContext = isAIReplyingToMainUser ? getRecentUserPostTexts() : [];

    const userSubReply: Reply = {
      id: crypto.randomUUID(),
      user: mainUserProfile,
      text: subReplyText,
      timestamp: Date.now(),
      likes: 0, 
      children: [],
      showReplyInput: false, 
    };
    
     setTimelineItems(prevItems =>
      prevItems.map(item => {
        if (item.id === timelineItemId && (item.type === 'post' || item.type === 'quoteRetweet')) {
          const currentItem = item as Post | QuoteRetweet;
          const updateFn = (reply: Reply) => ({
            ...reply,
            children: [...(reply.children || []), userSubReply],
            isGeneratingChildren: true, 
            errorGeneratingChildren: undefined, 
            showReplyInput: false, 
          });
          const newAllReplies = currentItem.allReplies ? updateReplyInChildren(currentItem.allReplies, parentReplyId, updateFn) : [];
          const newReplies = currentItem.replies ? updateReplyInChildren(currentItem.replies, parentReplyId, updateFn) : [];
          return { ...currentItem, allReplies: newAllReplies, replies: newReplies };
        }
        return item;
      })
    );
    
    recordApiCall();

    try {
      const geminiReplies = await generatePositiveReplies(subReplyText, parentReply.user, pastUserPostsForContext, mainUserProfile.name);

      if (geminiReplies === null) {
        setApiKeyStatus("APIキーが設定されていないか無効です。Geminiの機能は制限されます。");
         setTimelineItems(prevItems => prevItems.map(item => {
            if (item.id === timelineItemId && (item.type === 'post' || item.type === 'quoteRetweet')) {
                const currentItem = item as Post | QuoteRetweet;
                const updateFn = (reply: Reply) => ({
                    ...reply,
                    isGeneratingChildren: false,
                    errorGeneratingChildren: "APIキーの問題でAIの返信を生成できませんでした。",
                });
                const newAllReplies = currentItem.allReplies ? updateReplyInChildren(currentItem.allReplies, parentReplyId, updateFn) : [];
                const newReplies = currentItem.replies ? updateReplyInChildren(currentItem.replies, parentReplyId, updateFn) : [];
                return { ...currentItem, allReplies: newAllReplies, replies: newReplies };
            }
            return item;
        }));
        return;
      }
      
      if (!geminiReplies || geminiReplies.length === 0) {
         setTimelineItems(prevItems => prevItems.map(item => {
            if (item.id === timelineItemId && (item.type === 'post' || item.type === 'quoteRetweet')) {
                const currentItem = item as Post | QuoteRetweet;
                const updateFn = (reply: Reply) => ({
                    ...reply,
                    isGeneratingChildren: false,
                    errorGeneratingChildren: "AIがこの返信に対するさらなる応答を生成できませんでした。",
                });
                const newAllReplies = currentItem.allReplies ? updateReplyInChildren(currentItem.allReplies, parentReplyId, updateFn) : [];
                const newReplies = currentItem.replies ? updateReplyInChildren(currentItem.replies, parentReplyId, updateFn) : [];
                return { ...currentItem, allReplies: newAllReplies, replies: newReplies };
            }
            return item;
        }));
        return;
      }

      const aiGeneratedReplyData = geminiReplies[0]; 
      const aiSubReply: Reply = {
        id: crypto.randomUUID(),
        user: { ...parentReply.user }, 
        text: aiGeneratedReplyData.replyText,
        timestamp: Date.now() + 1, 
        likes: 0, 
        children: [],
      };

      setTimelineItems(prevItems =>
        prevItems.map(item => {
          if (item.id === timelineItemId && (item.type === 'post' || item.type === 'quoteRetweet')) {
            const currentItem = item as Post | QuoteRetweet;
            const updateFn = (reply: Reply) => ({
              ...reply,
              children: [...(reply.children || []), aiSubReply], 
              isGeneratingChildren: false,
            });
            const newAllReplies = currentItem.allReplies ? updateReplyInChildren(currentItem.allReplies, parentReplyId, updateFn) : [];
            const newReplies = currentItem.replies ? updateReplyInChildren(currentItem.replies, parentReplyId, updateFn) : [];
            return { ...currentItem, allReplies: newAllReplies, replies: newReplies };
          }
          return item;
        })
      );

    } catch (error) {
      console.error("AIサブ返信生成エラー:", error);
      setTimelineItems(prevItems =>
        prevItems.map(item => {
          if (item.id === timelineItemId && (item.type === 'post' || item.type === 'quoteRetweet')) {
            const currentItem = item as Post | QuoteRetweet;
            const updateFn = (reply: Reply) => ({
              ...reply,
              isGeneratingChildren: false,
              errorGeneratingChildren: "AIの返信取得中にエラーが発生しました。",
            });
            const newAllReplies = currentItem.allReplies ? updateReplyInChildren(currentItem.allReplies, parentReplyId, updateFn) : [];
            const newReplies = currentItem.replies ? updateReplyInChildren(currentItem.replies, parentReplyId, updateFn) : [];
            return { ...currentItem, allReplies: newAllReplies, replies: newReplies };
          }
          return item;
        })
      );
    }
  }, [timelineItems, apiKeyStatus, checkAndManageRateLimit, recordApiCall, getRecentUserPostTexts, mainUserProfile]); 


  const handlePostSubmit = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const newPostId = crypto.randomUUID();
    const pastUserPostsForContext = getRecentUserPostTexts(); 

    let initialPostState: Post = {
      type: 'post',
      id: newPostId,
      user: mainUserProfile,
      text,
      timestamp: Date.now(),
      isGeneratingReplies: false, 
      canLoadMore: false, 
      replies: [], 
      allReplies: []
    };
    
    setApiKeyStatus(null); 
    
    const { canProceed, message: rateLimitMsg } = checkAndManageRateLimit();
    if (!canProceed) {
      initialPostState = {
        ...initialPostState,
        isGeneratingReplies: false,
        errorGeneratingReplies: rateLimitMsg || "APIの利用が一時的に制限されています。",
      };
      setTimelineItems(prevItems => [initialPostState, ...prevItems]);
      // Reset visible post count to ensure new post is visible among the top ones
      setVisiblePostCount(INITIAL_VISIBLE_POSTS);
      return;
    }
    
    recordApiCall(); 
    initialPostState = {...initialPostState, isGeneratingReplies: true };
    setTimelineItems(prevItems => [initialPostState, ...prevItems]);
    // Reset visible post count to ensure new post is visible among the top ones
    setVisiblePostCount(INITIAL_VISIBLE_POSTS);


    try {
      const geminiReplies: GeneratedReply[] | null = await generatePositiveReplies(text, undefined, pastUserPostsForContext, mainUserProfile.name);

      if (geminiReplies === null) { 
         setTimelineItems(prevItems =>
          prevItems.map(item =>
            item.id === newPostId && item.type === 'post' ? { ...item, isGeneratingReplies: false, errorGeneratingReplies: "APIキーが設定されていないか無効です。コンソールを確認してください。", canLoadMore: false } : item
          )
        );
        setApiKeyStatus("APIキーが設定されていないか無効です。Geminiの機能は制限されます。");
      } else if (!geminiReplies || geminiReplies.length === 0) {
        setTimelineItems(prevItems =>
          prevItems.map(item =>
            item.id === newPostId && item.type === 'post' ? { ...item, isGeneratingReplies: false, errorGeneratingReplies: "今回は返信を生成できませんでした。もう一度試してみてください！", canLoadMore: false } : item
          )
        );
      } else {
          const allCreatedReplies: Reply[] = geminiReplies.map((replyData, index) => {
            const aiUsername = generateDisplayUsername(replyData.username); // This will handle @tadasumen and @kenta_b
            
            let avatarUrlToUse: string;
            if (replyData.username === "ただすめん") {
              avatarUrlToUse = generateSilhouetteAvatarDataUrl(TADASUMEN_AVATAR_BG_COLOR);
            } else if (replyData.username === "ケンタ兄さん") {
              avatarUrlToUse = generateSilhouetteAvatarDataUrl(KENTA_NIISAN_AVATAR_BG_COLOR);
            } else {
              const avatarSeed = `${encodeURIComponent(aiUsername)}_${newPostId}_${index}`;
              avatarUrlToUse = getRandomAiAvatarUrl(avatarSeed);
            }

            return {
              id: crypto.randomUUID(),
              user: { 
                id: `ai-user-${newPostId}-${index}-${replyData.username}`, // Make ID more unique for debugging
                name: replyData.username, // This is the display name e.g. "ただすめん"
                username: aiUsername,     // This is the @username e.g. "@tadasumen"
                avatarUrl: avatarUrlToUse,
                initialReplyText: replyData.replyText, 
              },
              text: replyData.replyText,
              timestamp: Date.now() + index + 1, 
              likes: 0, 
              children: [],
              showReplyInput: false,
            };
          });
    
          const initialDisplayCount = Math.min(allCreatedReplies.length, MAX_INITIAL_REPLIES);
    
          setTimelineItems(prevItems =>
            prevItems.map(item =>
              item.id === newPostId && item.type === 'post'
                ? { 
                    ...item, 
                    allReplies: allCreatedReplies, 
                    replies: allCreatedReplies.slice(0, initialDisplayCount),
                    isGeneratingReplies: false,
                    canLoadMore: allCreatedReplies.length > 0,
                  } 
                : item
            )
          );
      }

      const delay = Math.random() * (QUOTE_REPOST_DELAY_MAX - QUOTE_REPOST_DELAY_MIN) + QUOTE_REPOST_DELAY_MIN;
      setTimeout(async () => {
        const { canProceed: canProceedQR, message: rateLimitMsgQR } = checkAndManageRateLimit();
        if (!canProceedQR) {
          console.warn("引用リポストの生成はレート制限によりスキップされました:", rateLimitMsgQR);
           if (!apiKeyStatus && !rateLimitMessage) { 
                setRateLimitMessage(rateLimitMsgQR || "レート制限により引用リポストを生成できませんでした。");
           }
          return;
        }
        recordApiCall(); 

        if (!process.env.API_KEY) {
            console.warn("APIキーがないため、引用リポストは生成されませんでした。");
            if (!apiKeyStatus && !rateLimitMessage) { 
                 setApiKeyStatus("APIキーが設定されていないため、一部機能（引用リポストなど）が動作しません。");
            }
            return;
        }

        try {
          const currentPostForQR = (timelineItemsRef.current.find(item => item.id === newPostId && item.type === 'post') as Post | undefined) || initialPostState;

          const quoteCommentData: GeneratedQuoteComment | null = await generateQuoteRetweetComment(currentPostForQR.text, mainUserProfile.name);
          if (quoteCommentData) {
            const aiQuoteUsername = generateDisplayUsername(quoteCommentData.username);
            
            let quoteAvatarUrl: string;
             // Ensure rare characters don't get special avatar in quote retweets unless specifically designed for it
            if (quoteCommentData.username === "ただすめん") {
                quoteAvatarUrl = generateSilhouetteAvatarDataUrl(TADASUMEN_AVATAR_BG_COLOR);
            } else if (quoteCommentData.username === "ケンタ兄さん") {
                 quoteAvatarUrl = generateSilhouetteAvatarDataUrl(KENTA_NIISAN_AVATAR_BG_COLOR);
            } else {
                const avatarSeed = `${encodeURIComponent(aiQuoteUsername)}_${newPostId}_quote`;
                quoteAvatarUrl = getRandomAiAvatarUrl(avatarSeed);
            }

            const quoteUser: UserProfile = {
              id: `ai-quote-user-${newPostId}-${crypto.randomUUID()}`,
              name: quoteCommentData.username,
              username: aiQuoteUsername,
              avatarUrl: quoteAvatarUrl,
            };
            const newQuoteRepost: QuoteRetweet = {
              type: 'quoteRetweet',
              id: crypto.randomUUID(),
              user: quoteUser,
              text: quoteCommentData.commentText,
              timestamp: Date.now() + 100, 
              quotedPost: currentPostForQR, 
              allReplies: [], 
              replies: [],
              showDirectReplyInput: false,
            };
            setTimelineItems(prevItems => [newQuoteRepost, ...prevItems].sort((a,b) => b.timestamp - a.timestamp)); 
            // Reset visible post count if a quote retweet is added, so it's visible
            setVisiblePostCount(prevCount => Math.max(prevCount, INITIAL_VISIBLE_POSTS));
          } else {
             if (process.env.API_KEY && !rateLimitMessage) { 
                console.warn("AIの引用リポストコメントを生成できませんでしたが、APIキーは設定されています。モデルの応答が期待通りでなかった可能性があります。");
             }
          }
        } catch (error) {
          console.error("引用リポスト生成エラー:", error);
        }
      }, delay);

    } catch (error) {
      console.error("返信生成エラー:", error);
      setTimelineItems(prevItems =>
        prevItems.map(item =>
          item.id === newPostId && item.type === 'post' ? { ...item, isGeneratingReplies: false, errorGeneratingReplies: "返信取得中に予期せぬエラーが発生しました。", canLoadMore: false } : item
        )
      );
    }
  }, [apiKeyStatus, checkAndManageRateLimit, recordApiCall, rateLimitMessage, getRecentUserPostTexts, mainUserProfile]);
  
  const timelineItemsRef = useRef(timelineItems);
  useEffect(() => {
    timelineItemsRef.current = timelineItems;
  }, [timelineItems]);


  const handleLoadMoreReplies = useCallback(async (timelineItemId: string) => {
     const currentItem = timelineItems.find(item => item.id === timelineItemId);
     if (!currentItem || currentItem.type !== 'post') return; 
    
    const { canProceed, message: rateLimitMsg } = checkAndManageRateLimit();
    if (!canProceed) {
      setTimelineItems(prevItems =>
        prevItems.map(item =>
          item.id === timelineItemId && item.type === 'post' ? { ...item, isGeneratingMoreReplies: false, errorGeneratingMoreReplies: rateLimitMsg || "APIの利用が一時的に制限されています。", canLoadMore: (item as Post).allReplies.length > 0 } : item
        )
      );
      return;
    }
    recordApiCall();

    setTimelineItems(prevItems =>
      prevItems.map(item =>
        item.id === timelineItemId && item.type === 'post' ? { ...item, isGeneratingMoreReplies: true, errorGeneratingMoreReplies: undefined } : item
      )
    );
  
    const currentPost = currentItem as Post;
    const pastUserPostsForContext = getRecentUserPostTexts();
  
    try {
      const additionalRepliesData = await generatePositiveReplies(currentPost.text, undefined, pastUserPostsForContext, mainUserProfile.name); 
  
      if (additionalRepliesData === null) {
        setTimelineItems(prevItems =>
          prevItems.map(item =>
            item.id === timelineItemId && item.type === 'post' ? { ...item, isGeneratingMoreReplies: false, errorGeneratingMoreReplies: "APIキーの問題で追加の返信を生成できませんでした。", canLoadMore: false } : item
          )
        );
        if (!apiKeyStatus && !rateLimitMessage) setApiKeyStatus("APIキーが設定されていないか無効です。");
        return;
      }
  
      if (!additionalRepliesData || additionalRepliesData.length === 0) {
        setTimelineItems(prevItems =>
          prevItems.map(item =>
            item.id === timelineItemId && item.type === 'post' ? { ...item, isGeneratingMoreReplies: false, canLoadMore: false, errorGeneratingMoreReplies: "これ以上新しい返信を生成できませんでした。" } : item
          )
        );
        return;
      }
  
      const newReplies: Reply[] = additionalRepliesData.map((replyData, index) => {
        const uniqueSuffix = `${currentPost.allReplies.length + index}`;
        const aiUsername = generateDisplayUsername(replyData.username); // Handles rare character @usernames
        
        let avatarUrlToUse: string;
        if (replyData.username === "ただすめん") {
          avatarUrlToUse = generateSilhouetteAvatarDataUrl(TADASUMEN_AVATAR_BG_COLOR);
        } else if (replyData.username === "ケンタ兄さん") {
          avatarUrlToUse = generateSilhouetteAvatarDataUrl(KENTA_NIISAN_AVATAR_BG_COLOR);
        } else {
          const avatarSeed = `${encodeURIComponent(aiUsername)}_${timelineItemId}_${uniqueSuffix}`;
          avatarUrlToUse = getRandomAiAvatarUrl(avatarSeed);
        }

        return {
          id: crypto.randomUUID(),
          user: {
            id: `ai-user-${timelineItemId}-${uniqueSuffix}-${replyData.username}`,
            name: replyData.username,
            username: aiUsername,
            avatarUrl: avatarUrlToUse,
            initialReplyText: replyData.replyText,
          },
          text: replyData.replyText,
          timestamp: Date.now() + currentPost.allReplies.length + index + 1,
          likes: 0,
          children: [],
          showReplyInput: false,
        };
      });
  
      setTimelineItems(prevItems =>
        prevItems.map(item =>
          item.id === timelineItemId && item.type === 'post'
            ? {
                ...item,
                allReplies: [...item.allReplies, ...newReplies],
                replies: [...item.replies, ...newReplies], 
                isGeneratingMoreReplies: false,
                canLoadMore: newReplies.length > 0, 
              }
            : item
        )
      );
    } catch (error) {
      console.error("追加返信生成エラー:", error);
      setTimelineItems(prevItems =>
        prevItems.map(item =>
          item.id === timelineItemId && item.type === 'post' ? { ...item, isGeneratingMoreReplies: false, errorGeneratingMoreReplies: "追加返信取得中にエラーが発生しました。" } : item
        )
      );
    }
  }, [timelineItems, apiKeyStatus, checkAndManageRateLimit, recordApiCall, rateLimitMessage, getRecentUserPostTexts, mainUserProfile]);

  const handleToggleDirectReplyInputForQuoteRetweet = useCallback((quoteRetweetId: string) => {
    setTimelineItems(prevItems =>
      prevItems.map(item => {
        if (item.type === 'quoteRetweet' && item.id === quoteRetweetId) {
          return { ...item, showDirectReplyInput: !item.showDirectReplyInput };
        }
        return item;
      })
    );
  }, []);

  const handleDirectReplyToQuoteRetweetSubmit = useCallback(async (quoteRetweetId: string, userReplyText: string) => {
    if (!userReplyText.trim()) return;
    
    const { canProceed, message: rateLimitMsg } = checkAndManageRateLimit();
    if (!canProceed) {
        setTimelineItems(prevItems => prevItems.map(item => {
            if (item.id === quoteRetweetId && item.type === 'quoteRetweet') {
                const qr = item as QuoteRetweet;
                return {
                    ...qr,
                    showDirectReplyInput: false, 
                };
            }
            return item;
        }));
         if (!rateLimitMessage) setRateLimitMessage(rateLimitMsg || "APIの利用が一時的に制限されています。"); 
        return;
    }


    const targetQuoteRetweet = timelineItems.find(item => item.id === quoteRetweetId && item.type === 'quoteRetweet') as QuoteRetweet | undefined;
    if (!targetQuoteRetweet) {
      console.error("対象の引用リポストが見つかりません:", quoteRetweetId);
      return;
    }
    
    const pastUserPostsForContext = getRecentUserPostTexts();


    const userReply: Reply = {
      id: crypto.randomUUID(),
      user: mainUserProfile,
      text: userReplyText,
      timestamp: Date.now(),
      likes: 0,
      children: [],
      isGeneratingChildren: false, 
      showReplyInput: false,
    };

    setTimelineItems(prevItems =>
      prevItems.map(item => {
        if (item.id === quoteRetweetId && item.type === 'quoteRetweet') {
          return {
            ...item,
            allReplies: [...item.allReplies, userReply],
            replies: [...item.replies, userReply], 
            showDirectReplyInput: false,
          };
        }
        return item;
      })
    );

    recordApiCall();
    
    setTimelineItems(prevItems => prevItems.map(item => {
        if (item.id === quoteRetweetId && item.type === 'quoteRetweet') {
            const qr = item as QuoteRetweet;
            return {
                ...qr,
                allReplies: qr.allReplies.map(r => r.id === userReply.id ? {...r, isGeneratingChildren: true } : r),
                replies: qr.replies.map(r => r.id === userReply.id ? {...r, isGeneratingChildren: true } : r),
            };
        }
        return item;
    }));


    try {
      const geminiReplies = await generatePositiveReplies(userReplyText, targetQuoteRetweet.user, pastUserPostsForContext, mainUserProfile.name);

      if (geminiReplies === null) {
        if (!apiKeyStatus && !rateLimitMessage) setApiKeyStatus("APIキーが設定されていないか無効です。Geminiの機能は制限されます。");
         setTimelineItems(prevItems => prevItems.map(item => {
            if (item.id === quoteRetweetId && item.type === 'quoteRetweet') {
                const qr = item as QuoteRetweet;
                return {
                    ...qr,
                    allReplies: qr.allReplies.map(r => r.id === userReply.id ? {...r, isGeneratingChildren: false, errorGeneratingChildren: "APIキーの問題でAIの返信を生成できませんでした。" } : r),
                    replies: qr.replies.map(r => r.id === userReply.id ? {...r, isGeneratingChildren: false, errorGeneratingChildren: "APIキーの問題でAIの返信を生成できませんでした。" } : r),
                };
            }
            return item;
        }));
        return;
      }

      if (!geminiReplies || geminiReplies.length === 0) {
        setTimelineItems(prevItems => prevItems.map(item => {
            if (item.id === quoteRetweetId && item.type === 'quoteRetweet') {
                const qr = item as QuoteRetweet;
                return {
                    ...qr,
                    allReplies: qr.allReplies.map(r => r.id === userReply.id ? {...r, isGeneratingChildren: false, errorGeneratingChildren: "AIがこの返信に対する応答を生成できませんでした。" } : r),
                    replies: qr.replies.map(r => r.id === userReply.id ? {...r, isGeneratingChildren: false, errorGeneratingChildren: "AIがこの返信に対する応答を生成できませんでした。" } : r),
                };
            }
            return item;
        }));
        return;
      }
      
      const aiGeneratedReplyData = geminiReplies[0];
      const aiSubReply: Reply = {
        id: crypto.randomUUID(),
        user: { ...targetQuoteRetweet.user }, 
        text: aiGeneratedReplyData.replyText,
        timestamp: Date.now() + 1,
        likes: 0,
        children: [],
      };

      setTimelineItems(prevItems =>
        prevItems.map(item => {
          if (item.id === quoteRetweetId && item.type === 'quoteRetweet') {
            const qr = item as QuoteRetweet;
            const updateChildrenFn = (reply: Reply) => {
              if (reply.id === userReply.id) {
                return {
                  ...reply,
                  children: [...(reply.children || []), aiSubReply],
                  isGeneratingChildren: false,
                };
              }
              return reply;
            };
            return {
              ...qr,
              allReplies: qr.allReplies.map(updateChildrenFn),
              replies: qr.replies.map(updateChildrenFn),
            };
          }
          return item;
        })
      );

    } catch (error) {
      console.error("引用リポストへのAI返信生成エラー:", error);
       setTimelineItems(prevItems => prevItems.map(item => {
            if (item.id === quoteRetweetId && item.type === 'quoteRetweet') {
                const qr = item as QuoteRetweet;
                 return {
                    ...qr,
                    allReplies: qr.allReplies.map(r => r.id === userReply.id ? {...r, isGeneratingChildren: false, errorGeneratingChildren: "AI返信取得中にエラー発生。" } : r),
                    replies: qr.replies.map(r => r.id === userReply.id ? {...r, isGeneratingChildren: false, errorGeneratingChildren: "AI返信取得中にエラー発生。" } : r),
                };
            }
            return item;
        }));
    }
  }, [timelineItems, apiKeyStatus, checkAndManageRateLimit, recordApiCall, rateLimitMessage, getRecentUserPostTexts, mainUserProfile]);


  useEffect(() => {
    const timers: NodeJS.Timeout[] = []; 
    timelineItems.forEach(item => {
      if (item.type === 'post') {
        const post = item as Post;
        if (!post.isGeneratingReplies && !post.isGeneratingMoreReplies && post.allReplies.length > post.replies.length) {
          const revealNextReply = () => {
            setTimelineItems(prev => {
              const updatedItems = prev.map(pItem => {
                if (pItem.type === 'post' && pItem.id === post.id) {
                  const currentPost = pItem as Post;
                  if (!currentPost.isGeneratingReplies && !currentPost.isGeneratingMoreReplies && currentPost.allReplies.length > currentPost.replies.length) {
                    const nextCount = currentPost.replies.length + 1;
                    return {
                      ...currentPost,
                      replies: currentPost.allReplies.slice(0, nextCount),
                    };
                  }
                }
                return pItem;
              });
              
              const currentPostAfterUpdate = updatedItems.find(pItem => pItem.id === post.id && pItem.type === 'post') as Post | undefined;
              if (currentPostAfterUpdate && 
                  !currentPostAfterUpdate.isGeneratingReplies &&
                  !currentPostAfterUpdate.isGeneratingMoreReplies &&
                  currentPostAfterUpdate.allReplies.length > currentPostAfterUpdate.replies.length) {
                 const randomInterval = Math.random() * (REPLY_REVEAL_INTERVAL_MAX - REPLY_REVEAL_INTERVAL_MIN) + REPLY_REVEAL_INTERVAL_MIN;
                 timers.push(setTimeout(revealNextReply, randomInterval)); 
              }
              return updatedItems; 
            });
          };
          const randomInterval = Math.random() * (REPLY_REVEAL_INTERVAL_MAX - REPLY_REVEAL_INTERVAL_MIN) + REPLY_REVEAL_INTERVAL_MIN;
          timers.push(setTimeout(revealNextReply, randomInterval)); 
        }
      }
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [timelineItems]);


  const handleShowMorePosts = () => {
    setVisiblePostCount(prevCount => Math.min(prevCount + POSTS_TO_LOAD_PER_CLICK, timelineItems.length));
  };

  const handleCollapseOlderPosts = () => {
    setVisiblePostCount(INITIAL_VISIBLE_POSTS);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 py-8 flex flex-col items-center">
      <header className="mb-6 text-center w-full max-w-2xl px-4">
        <h1 className="text-4xl font-bold text-primary-600 dark:text-primary-400">全肯定シミュレーったー</h1>
        
        <div className="mt-4 flex items-center justify-center space-x-2">
          {isEditingName ? (
            <>
              <input
                type="text"
                value={nameInput}
                onChange={handleNameInputChange}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500 text-sm"
                maxLength={20}
                aria-label="新しい名前を入力"
              />
              <button
                onClick={handleSaveName}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm font-semibold transition-colors duration-150"
              >
                保存
              </button>
              <button
                onClick={handleCancelEditName}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-md text-sm transition-colors duration-150"
              >
                キャンセル
              </button>
            </>
          ) : (
            <>
              <span className="text-lg text-gray-800 dark:text-gray-200">
                こんにちは、<strong className="font-semibold text-primary-600 dark:text-primary-400">{mainUserProfile.name}</strong> さん！
              </span>
              <button
                onClick={handleEditName}
                className="ml-2 px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded-md text-xs font-semibold transition-colors duration-150"
                aria-label="名前を編集"
              >
                名前変更
              </button>
            </>
          )}
        </div>

        <p className="text-base text-gray-700 dark:text-gray-300 mt-3 max-w-xl mx-auto">
          あなたの投稿に、AIが生み出すたくさんの優しい人々が、温かい言葉と共感の嵐で応えてくれる“あり得ない”ソーシャルメディア体験シミュレーターです。
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 px-4 max-w-xl mx-auto">
          このアプリは、AIとの会話を楽しむシミュレーションです。あなたの投稿は、AIが返信を作るためにGoogleのAIモデル（Gemini API）へ送られますが、アプリが投稿内容を外部に直接公開することはありません。登場するキャラクターや内容は全て架空のもので、実在の人物や団体とは無関係です。安心して楽しんでいただくために、個人情報や機密情報の入力はお控えくださいね。
        </p>
         {apiKeyStatus && (
          <p className="mt-2 text-sm text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900 p-2 rounded-md">{apiKeyStatus}</p>
        )}
        {rateLimitMessage && ( 
          <p className="mt-2 text-sm text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900 p-2 rounded-md">{rateLimitMessage}</p>
        )}
      </header>

      <main className="w-full max-w-2xl px-4">
        <PostInput onPostSubmit={handlePostSubmit} userProfile={mainUserProfile} />
        <PostFeed 
            timelineItems={timelineItems.slice(0, visiblePostCount)} 
            onToggleReplyInput={handleToggleReplyInput}
            onSubReplySubmit={handleSubReplySubmit}
            onLoadMoreReplies={handleLoadMoreReplies} 
            onToggleDirectReplyInputForQuoteRetweet={handleToggleDirectReplyInputForQuoteRetweet}
            onDirectReplyToQuoteRetweetSubmit={handleDirectReplyToQuoteRetweetSubmit}
            mainUserProfile={mainUserProfile}
        />

        {timelineItems.length > visiblePostCount && (
          <div className="mt-6 text-center">
            <button
              onClick={handleShowMorePosts}
              className="px-6 py-3 bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-200 hover:bg-primary-200 dark:hover:bg-primary-700 rounded-full font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 text-base"
              aria-label={`もっと投稿を見る (${timelineItems.length - visiblePostCount}件残っています)`}
            >
              もっと投稿を見る ({timelineItems.length - visiblePostCount}件) <span role="img" aria-label="downwards arrow">🔽</span>
            </button>
          </div>
        )}
        {timelineItems.length > INITIAL_VISIBLE_POSTS && visiblePostCount >= timelineItems.length && (
          <div className="mt-6 text-center">
            <button
              onClick={handleCollapseOlderPosts}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 text-base"
              aria-label="古い投稿を折りたたむ"
            >
              古い投稿を折りたたむ <span role="img" aria-label="upwards arrow">🔼</span>
            </button>
          </div>
        )}
      </main>
      <footer className="mt-12 text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} 全肯定シミュレーったー. Powered by Gemini.</p>
      </footer>
    </div>
  );
};

export default App;
