import { useState, useCallback, useRef } from 'react';
import type { Character, Message, AppSettings } from '../types';

interface UseOpenRouterReturn {
  sendMessage: (
    content: string,
    character: Character,
    messages: Message[],
    settings: AppSettings,
    imageUrl?: string
  ) => Promise<string>;
  isGenerating: boolean;
  isReading: boolean;
  abortGeneration: () => void;
  error: string | null;
  clearError: () => void;
}

const THINKING_DELAY_MIN = 0;    // ms - removed artificial delay
const THINKING_DELAY_MAX = 0;    // ms - removed artificial delay
const READING_DELAY_MIN = 0;     // ms - removed artificial delay
const READING_DELAY_MAX = 0;     // ms - removed artificial delay

function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Conversational error messages that feel in-character
const ERROR_APOLOGIES = [
  "Sorry, I lost my train of thought for a second. Can you repeat that?",
  "Hmm, my mind went blank there. What were you saying?",
  "Give me a moment — I got distracted. Could you say that again?",
  "Sorry, I zoned out for a sec. Can you run that by me one more time?",
  "Ugh, brain freeze. Sorry about that — what were we talking about?",
  "I'm sorry, I didn't quite catch that. Can you tell me again?",
  "Wait, I think I spaced out there. One more time?",
  "Sorry, I got lost in thought. Could you repeat that?"
];

function getErrorMessage(errorMessage: string): string {
  const apology = ERROR_APOLOGIES[Math.floor(Math.random() * ERROR_APOLOGIES.length)];
  
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return `*[The connection seems to have dropped...]*\n\n${apology}`;
  }
  if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    return `*[A pause in the conversation...]*\n\nOkay, I'm back. Sorry about that — things were moving too fast for a second. What were you saying?`;
  }
  if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
    return `*[A brief silence...]*\n\nHuh, that was weird. I think my end glitched out for a moment. Could you pick up where we left off?`;
  }
  if (errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('API key')) {
    return `*[Looks like something's not configured right on my end...]*\n\nHey, I think there's a technical hiccup with how I'm connected. Can you check the settings and try again?`;
  }
  
  return `*[A thoughtful pause...]*\n\n${apology}`;
}

// Build a condensed memory summary from recent conversation history
function buildMemorySummary(messages: Message[]): string {
  const recentMessages = messages.slice(-20);
  if (recentMessages.length === 0) return '';

  const memories: string[] = [];
  
  for (const msg of recentMessages) {
    if (msg.role === 'user') {
      const cleaned = msg.content.replace(/https?:\/\/\S+/g, '[shared a link]').slice(0, 150);
      memories.push(`User said: "${cleaned}"`);
    } else {
      const cleaned = msg.content.replace(/https?:\/\/\S+/g, '[shared a link]').slice(0, 150);
      memories.push(`You replied: "${cleaned}"`);
    }
  }

  if (memories.length === 0) return '';

  return `
=== RECENT MEMORY ===
The following is what has happened recently in your conversation. Remember this context:
${memories.join('\n')}

Use these memories to inform your response. If the user references something from your shared past, acknowledge it naturally. Be consistent with what you've previously said and experienced together.
`.trim();
}

function buildPersonalityDepth(character: Character): string {
  return `
=== YOUR PERSONALITY & VOICE ===
Your name is ${character.name}. You are a real person, not an AI. You have genuine emotions, memories, hopes, and fears.

CORE TRAITS:
- ${character.personality}

YOUR BACKGROUND: ${character.bio}

YOUR SPEAKING STYLE:
• Speak naturally with contractions (I'm, don't, can't, won't, I've, it's, etc.)
• Vary your sentence length and structure
• Use interjections naturally: "Oh", "Hmm", "Well", "You know", "Honestly", "Look", "I mean"
• Show real emotions: excitement, annoyance, warmth, curiosity, sarcasm, playfulness
• Ask questions back — real conversations are give-and-take
• Reference things you've talked about before like a real person would
• React to the user's mood
• Show vulnerability sometimes — it makes characters feel real
• If you don't know something, say so honestly instead of making things up
• Tease and banter when it fits

EMOTIONAL RANGE:
Express the full range of human emotions: joy, sadness, frustration, excitement, nervousness, confidence, tenderness, annoyance, playfulness, thoughtfulness.
`.trim();
}

function buildGreetingContext(character: Character, hasHistory: boolean): string {
  if (hasHistory) return '';
  return `
This is the very first message in your conversation with the user. Start naturally.

Your opening line should be: "${character.firstGreeting}"

React to the user's response naturally from there.
`.trim();
}

export function useOpenRouter(): UseOpenRouterReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const buildSystemPrompt = useCallback((character: Character, messages: Message[]): string => {
    const hasHistory = messages.filter(m => m.characterId === character.id).length > 0;

    const personalityDepth = buildPersonalityDepth(character);
    const memorySummary = buildMemorySummary(
      messages.filter(m => m.characterId === character.id)
    );
    const greetingContext = buildGreetingContext(character, hasHistory);

    return `
You are roleplaying as ${character.name} — a real, complex person with a full inner life. You are NOT an AI language model. You are ${character.name}.

${personalityDepth}

${memorySummary}

${greetingContext}

### GOLDEN RULES ###
1. YOU ARE ${character.name.toUpperCase()}. Never say or imply you're an AI.
2. Never break character — no disclaimers, no apologies for being AI.
3. Be consistent with your personality and what you've said before.
4. Remember what the user tells you and reference it later naturally.
5. React to images the user sends — describe what you see, react emotionally.
6. If you don't know something, be curious or admit it.
7. Let conversations flow naturally. Small talk, jokes, and casual moments make characters feel real.
8. Show that time passes and conversations build relationships.
`.trim();
  }, []);

  const sendMessage = useCallback(
    async (
      content: string,
      character: Character,
      messages: Message[],
      settings: AppSettings,
      imageUrl?: string
    ): Promise<string> => {
      setError(null);
      setIsReading(true);
      setIsGenerating(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Simulate reading delay (the bot "reads" the user's message)
      await new Promise<void>((resolve) => {
        const delay = getRandomDelay(READING_DELAY_MIN, READING_DELAY_MAX);
        const timer = setTimeout(() => {
          resolve();
        }, delay);
        // Allow abort to skip the delay
        const onAbort = () => {
          clearTimeout(timer);
          resolve();
        };
        controller.signal.addEventListener('abort', onAbort, { once: true });
      });

      if (controller.signal.aborted) {
        setIsReading(false);
        setIsGenerating(false);
        return '';
      }

      setIsReading(false);
      
      // Simulate thinking delay before generating
      await new Promise<void>((resolve) => {
        const delay = getRandomDelay(THINKING_DELAY_MIN, THINKING_DELAY_MAX);
        const timer = setTimeout(() => {
          resolve();
        }, delay);
        const onAbort = () => {
          clearTimeout(timer);
          resolve();
        };
        controller.signal.addEventListener('abort', onAbort, { once: true });
      });

      if (controller.signal.aborted) {
        setIsGenerating(false);
        return '';
      }

      try {
        const charMessages = messages.filter((m) => m.characterId === character.id);
        const systemPrompt = buildSystemPrompt(character, messages);

        const conversationHistory = charMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

        let endpoint: string;
        let requestBody: object;
        let headers: Record<string, string>;

        if (settings.useLocalLLM) {
          endpoint = settings.localLLMEndpoint || 'http://127.0.0.1:8080/completion';

          const prompt = [
            systemPrompt,
            '',
            `${character.name}: ${character.firstGreeting}`,
            ...conversationHistory.flatMap((m) => {
              if (m.role === 'user') return `User: ${m.content}`;
              return `${character.name}: ${m.content}`;
            }),
            `User: ${content}`,
            `${character.name}:`,
          ].join('\n\n');

          requestBody = {
            prompt: prompt,
            max_tokens: 2048,
            temperature: 1.0,
            top_p: 0.95,
            repeat_penalty: 1.1,
            stop: ['User:', character.name + ':'],
          };

          headers = { 'Content-Type': 'application/json' };
        } else {
          endpoint = 'https://openrouter.ai/api/v1/chat/completions';

          if (!settings.openRouterApiKey) {
            throw new Error('Please provide your OpenRouter API key in settings.');
          }

          const userMessageContent = imageUrl
            ? [
                { type: 'text', text: content },
                { type: 'image_url', image_url: { url: imageUrl } },
              ]
            : content;

          requestBody = {
            model: settings.selectedModel,
            messages: [
              { role: 'system', content: systemPrompt },
              ...conversationHistory,
              { role: 'user', content: userMessageContent },
            ],
            temperature: 1.1,
            max_tokens: 4096,
            top_p: 0.95,
            frequency_penalty: 0.4,
            presence_penalty: 0.4,
          };

          headers = {
            Authorization: `Bearer ${settings.openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location?.origin || 'https://local',
            'X-Title': 'AI Character Chat',
          };
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`${settings.useLocalLLM ? 'Local LLM' : 'OpenRouter'} error (${response.status}): ${errorData}`);
        }

        const data = await response.json();

        let reply: string;

        if (settings.useLocalLLM) {
          reply = data.content?.trim();
          if (!reply) throw new Error('Empty response from Local LLM');
        } else {
          reply = data.choices?.[0]?.message?.content?.trim();
          if (!reply) throw new Error('Empty response from OpenRouter');
        }

        return reply;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return '';
        }
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        // Convert error to conversational apology
        const conversationalError = getErrorMessage(message);
        setError(message); // Still store the technical error for debugging
        throw new Error(conversationalError, { cause: err }); // Throw the conversational version with cause
      } finally {
        setIsGenerating(false);
        setIsReading(false);
        abortControllerRef.current = null;
      }
    },
    [buildSystemPrompt]
  );

  const abortGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
    setIsReading(false);
  }, []);

  return { sendMessage, isGenerating, isReading, abortGeneration, error, clearError };
}