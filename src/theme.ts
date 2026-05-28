export type ThemeId = 'dark' | 'light' | 'romantic' | 'terminal';

export interface Theme {
  id: ThemeId;
  name: string;
  icon: string;
  description: string;
}

export const THEMES: Theme[] = [
  {
    id: 'dark',
    name: 'Dark',
    icon: '🌙',
    description: 'AMOLED black theme',
  },
  {
    id: 'light',
    name: 'Light',
    icon: '☀️',
    description: 'Clean white theme',
  },
  {
    id: 'romantic',
    name: 'Romantic',
    icon: '💕',
    description: 'Pink & red hues',
  },
  {
    id: 'terminal',
    name: 'Terminal',
    icon: '💻',
    description: 'Fallout / Matrix style',
  },
];

export const DEFAULT_THEME: ThemeId = 'dark';