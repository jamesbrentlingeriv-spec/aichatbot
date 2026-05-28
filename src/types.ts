export interface Character {
  id: string;
  name: string;
  avatarUrl: string;
  bio: string;
  personality: string;
  firstGreeting: string;
  typicalResponses: string[];
}

export interface Message {
  id: string;
  characterId: string;
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
}

export const AVAILABLE_MODELS = [
  { id: 'gryphe/mythomax-l2-13b', name: 'MythoMax L2 13B (Free)' },
  { id: 'nousresearch/hermes-3-llama-3-8b', name: 'Hermes 3 Llama 3 8B (Free)' },
  { id: 'mistralai/mistral-7b-instruct-v0.3', name: 'Mistral 7B Instruct v0.3 (Free)' },
  { id: 'openchat/openchat-7b', name: 'OpenChat 7B (Free)' },
  { id: 'teknium/openhermes-2.5-mistral-7b', name: 'OpenHermes 2.5 Mistral 7B (Free)' },
];

export const DEFAULT_MODEL = 'gryphe/mythomax-l2-13b';