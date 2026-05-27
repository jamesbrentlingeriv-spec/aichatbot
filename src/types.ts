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
}

export interface AppSettings {
  openRouterApiKey: string;
  selectedModel: string;
}

export const AVAILABLE_MODELS = [
  { id: 'gryphe/mythomax-l2-13b', name: 'MythoMax L2 13B' },
  { id: 'nousresearch/hermes-3-llama-3-8b', name: 'Hermes 3 Llama 3 8B' },
  { id: 'sao10k/l3.3-euryale-70b', name: 'Euryale 1.3 70B' },
  { id: 'sao10k/l3-euryale-30b', name: 'Euryale 30B' },
  { id: 'jondurbin/airoboros-l2-70b', name: 'Airoboros L2 70B' },
  { id: 'nousresearch/nous-hermes-2-mixtral-8x7b-dpo', name: 'Nous Hermes 2 Mixtral DPO' },
  { id: 'mistralai/mistral-7b-instruct-v0.3', name: 'Mistral 7B Instruct v0.3' },
  { id: 'openchat/openchat-7b', name: 'OpenChat 7B' },
  { id: 'teknium/openhermes-2.5-mistral-7b', name: 'OpenHermes 2.5 Mistral 7B' },
  { id: 'cognitivecomputations/dolphin-mixtral-8x7b', name: 'Dolphin Mixtral 8x7B' },
  { id: 'migtissera/synthia-70b', name: 'Synthia 70B' },
];

export const DEFAULT_MODEL = 'gryphe/mythomax-l2-13b';