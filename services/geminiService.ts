import { GoogleGenAI } from "@google/genai";
import { ChatMessage, MessageType } from '../types';

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateSmartReply = async (messages: ChatMessage[]): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "AI unavailable";

  // Filter last 10 text messages for context
  const context = messages
    .filter(m => m.type === MessageType.TEXT)
    .slice(-10)
    .map(m => `${m.senderName}: ${m.content}`)
    .join('\n');

  const prompt = `You are a helpful communication assistant. Based on the following chat history, suggest 3 short, relevant, and polite reply options for the current user. Format them as a simple list separated by pipes (|). Do not add numbering or extra text.
  
  Chat History:
  ${context}
  
  Suggestions:`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "";
  }
};

export const summarizeConversation = async (messages: ChatMessage[]): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "AI unavailable";

  const context = messages
    .filter(m => m.type === MessageType.TEXT)
    .map(m => `${m.senderName}: ${m.content}`)
    .join('\n');

  if (!context) return "No conversation to summarize.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Summarize the following conversation in a concise paragraph:\n\n${context}`,
    });
    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating summary.";
  }
};
