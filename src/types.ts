export interface Character {
  id: string;
  name: string;
  avatarUrl: string;
  bio: string;
  personality: string;
  firstGreeting: string;
  typicalResponses: string[];
}

export interface Conversation {
  id: string;
  characterId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  characterId: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  imageUrl?: string;
}

export interface GeneratedImage {
  id: string;
  characterId: string;
  characterName: string;
  prompt: string;
  url: string;
  timestamp: number;
}

export interface AppSettings {
  openRouterApiKey: string;
  selectedModel: string;
  useLocalLLM: boolean;
  localLLMEndpoint: string;
  geminiLiveApiKey?: string;
  useVoiceChat?: boolean;
  randomMode?: 'normal' | 'erotic';
}

// Voice chat types
export type VoiceConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
export type VoiceActivityState = 'silent' | 'listening' | 'speaking' | 'interrupted';

export interface GeminiLiveConfig {
  apiKey: string;
  model: string; // "gemini-2.0-flash-live-001" or "gemini-2.5-flash-live-001"
  systemPrompt: string;
  tools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
}

export interface VoiceChatCallbacks {
  onTranscriptReceived: (text: string, isFinal: boolean) => void;
  onAssistantSpeech: (isSpeaking: boolean) => void;
  onConnectionStateChange: (state: VoiceConnectionState) => void;
  onError: (error: string) => void;
}

export const AVAILABLE_MODELS = [
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat (Free)' },
  { id: 'deepseek/deepseek-coder', name: 'DeepSeek Coder (Free)' },
  { id: 'gryphe/mythomax-l2-13b', name: 'MythoMax L2 13B (Free)' },
  { id: 'nousresearch/hermes-3-llama-3-8b', name: 'Hermes 3 Llama 3 8B (Free)' },
  { id: 'mistralai/mistral-7b-instruct-v0.3', name: 'Mistral 7B Instruct v0.3 (Free)' },
  { id: 'openchat/openchat-7b', name: 'OpenChat 7B (Free)' },
  { id: 'teknium/openhermes-2.5-mistral-7b', name: 'OpenHermes 2.5 Mistral 7B (Free)' },
];

export const VOICE_MODELS = [
  { id: 'gemini-2.0-flash-live-001', name: 'Gemini 2.0 Flash Live (Voice)' },
  { id: 'gemini-2.5-flash-live-001', name: 'Gemini 2.5 Flash Live (Voice)' },
];

export const LOCAL_LLM_PLACEHOLDER = 'http://127.0.0.1:8080/completion';

export const DEFAULT_MODEL = 'deepseek/deepseek-chat';