export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  SYSTEM = 'SYSTEM'
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string; // Text content or File metadata (name, type, size)
  fileData?: string; // Base64 data for files
  type: MessageType;
  timestamp: number;
}

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl: string;
}

export type AiProvider = 'gemini' | 'ollama' | 'openrouter';

export interface AiConfig {
  provider: AiProvider;
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
}

export interface PeerState {
  myId: string;
  connectedPeerId: string | null;
  isConnectionOpen: boolean;
  connectionError: string | null;
}
