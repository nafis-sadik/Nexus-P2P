export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  SYSTEM = 'SYSTEM'
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string; // Text content or File metadata (name)
  fileData?: string | Blob; // Base64 data or Blob for larger files
  fileType?: string; // e.g. image/png
  fileSize?: number; // bytes
  type: MessageType;
  timestamp: number;
}

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl: string;
}

export interface Participant extends UserProfile {
  isHost?: boolean;
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
  roomId: string | null;
  isHost: boolean;
  participants: Participant[];
  connectionError: string | null;
}

export enum SignalingType {
  PARTICIPANT_LIST = 'PARTICIPANT_LIST',
  NEW_PARTICIPANT = 'NEW_PARTICIPANT',
  MESH_CONNECT = 'MESH_CONNECT'
}

export interface SignalingMessage {
  type: SignalingType;
  payload: any;
}
