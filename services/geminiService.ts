
// import { GoogleGenAI, GenerateContentResponse } from "@google/genai"; // 不要になる
import type { GeneratedReply, UserProfile, GeneratedQuoteComment } from '../types';

// const API_KEY = process.env.API_KEY; // フロントエンドでは使用しないし、アクセスできない
// let ai: GoogleGenAI | null = null; // 不要になる
// if (API_KEY) { ... } // 不要になる

const PROXY_PATH = '/.netlify/functions/gemini-proxy'; // Netlify関数のパス

export const generatePositiveReplies = async (
  postText: string,
  replyingAsUser?: UserProfile,
  pastUserPostTexts?: string[],
  mainUserName?: string
): Promise<GeneratedReply[] | null> => {
  try {
    const response = await fetch(PROXY_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generateReplies',
        postText,
        replyingAsUser,
        pastUserPostTexts,
        mainUserName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Proxy Error: ${response.statusText} (Status: ${response.status})` }));
      console.error(`Error from Netlify function (generatePositiveReplies, status: ${response.status}):`, errorData.error || response.statusText);
      // APIキー関連のエラーメッセージをフロントに適切に伝える
      if (response.status === 500 && errorData.error && typeof errorData.error === 'string' && errorData.error.toLowerCase().includes("api key")) {
          return null; // APIキーエラーを示唆するためにnullを返す
      }
      return []; // その他のエラーは空配列を返す (App.tsx側でハンドリング)
    }

    // Netlify関数は既に適切なJSON形式 (GeneratedReply[] または null) で返す想定
    const result = await response.json();
    return result as GeneratedReply[] | null;

  } catch (error) {
    console.error("Error calling Netlify function for replies:", error);
    return []; // またはエラーを示す特定の形式
  }
};

export const generateQuoteRetweetComment = async (
  originalPostText: string,
  mainUserName?: string
): Promise<GeneratedQuoteComment | null> => {
    try {
        const response = await fetch(PROXY_PATH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'generateQuoteComment',
                originalPostText,
                mainUserName,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Proxy Error: ${response.statusText} (Status: ${response.status})` }));
            console.error(`Error from Netlify function (generateQuoteRetweetComment, status: ${response.status}):`, errorData.error || response.statusText);
            if (response.status === 500 && errorData.error && typeof errorData.error === 'string' && errorData.error.toLowerCase().includes("api key")) {
                return null; // APIキーエラーを示唆
            }
            return null;
        }
        // Netlify関数は既に適切なJSON形式 (GeneratedQuoteComment または null) で返す想定
        const result = await response.json();
        return result as GeneratedQuoteComment | null;

    } catch (error) {
        console.error("Error calling Netlify function for quote comment:", error);
        return null;
    }
};
