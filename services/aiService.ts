import { GoogleGenAI } from "@google/genai";
import { ChatMessage, MessageType, AiConfig } from '../types';

const callGemini = async (prompt: string, config: AiConfig) => {
  const apiKey = config.apiKey;
  if (!apiKey) throw new Error("Gemini API key missing. Please configure it in AI Settings.");
  
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: config.modelName || 'gemini-1.5-flash',
    contents: prompt,
  });
  return response.text || "";
};

const callOllama = async (prompt: string, config: AiConfig) => {
  const baseUrl = config.baseUrl || 'http://localhost:11434';
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.modelName || 'llama3',
      prompt: prompt,
      stream: false,
    }),
  });
  const data = await response.json();
  return data.response;
};

const callOpenAI = async (prompt: string, config: AiConfig) => {
  const baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'HTTP-Referer': window.location.origin, // Required by OpenRouter
      'X-Title': 'Nexus P2P',
    },
    body: JSON.stringify({
      model: config.modelName || 'openai/gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await response.json();
  return data.choices[0].message.content;
};

const callAi = async (prompt: string, config: AiConfig) => {
  switch (config.provider) {
    case 'gemini': return callGemini(prompt, config);
    case 'ollama': return callOllama(prompt, config);
    case 'openrouter': return callOpenAI(prompt, config);
    default: throw new Error("Unknown AI provider");
  }
};

export const generateSmartReply = async (messages: ChatMessage[], config?: AiConfig): Promise<string> => {
  if (!config) return "";

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
    return await callAi(prompt, config);
  } catch (error) {
    console.error("AI API Error:", error);
    return "";
  }
};

export const summarizeConversation = async (messages: ChatMessage[], config?: AiConfig): Promise<string> => {
  if (!config) return "AI not configured";

  const context = messages
    .filter(m => m.type === MessageType.TEXT)
    .map(m => `${m.senderName}: ${m.content}`)
    .join('\n');

  if (!context) return "No conversation to summarize.";

  try {
    return await callAi(`Summarize the following conversation in a concise paragraph:\n\n${context}`, config);
  } catch (error) {
    console.error("AI API Error:", error);
    return "Error generating summary.";
  }
};
