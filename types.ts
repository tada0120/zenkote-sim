
export interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  initialReplyText?: string; // AIキャラクターの最初の返信テキストを保持
  pastUserPosts?: string[]; // For providing context of user's recent posts to AI.
}

export interface Reply {
  id: string;
  user: UserProfile;
  text: string;
  timestamp: number; // Using number for Date.now()
  likes: number; // Initialized to 0 when created

  // For replies TO this reply (sub-replies/children)
  children?: Reply[];
  isGeneratingChildren?: boolean;
  errorGeneratingChildren?: string;
  showReplyInput?: boolean; // Controls visibility of input to reply to *this* reply
}

export interface Post {
  type: 'post'; // Discriminator for TimelineItem
  id:string;
  user: UserProfile;
  text: string;
  timestamp: number; // Using number for Date.now()
  
  allReplies: Reply[]; // Store all fetched replies here
  replies: Reply[]; // Replies currently displayed (subset of allReplies initially)
  
  isGeneratingReplies: boolean; 
  errorGeneratingReplies?: string;

  isGeneratingMoreReplies?: boolean; 
  errorGeneratingMoreReplies?: string; 
  canLoadMore?: boolean; 
}

export interface QuoteRetweet {
  type: 'quoteRetweet'; // Discriminator for TimelineItem
  id: string;
  user: UserProfile; // The user who made the quote retweet
  text: string; // The commentary of the quote retweet
  timestamp: number;
  quotedPost: Post; // The original post being quoted

  // For replies made directly TO this quote retweet
  allReplies: Reply[]; 
  replies: Reply[];    

  showDirectReplyInput?: boolean; // To show the form for MAIN_USER_PROFILE to reply to this QR.
}

export type TimelineItem = Post | QuoteRetweet;

export interface GeneratedReply {
  username: string;
  replyText: string;
}

export interface GeneratedQuoteComment {
  username: string;
  commentText: string;
}