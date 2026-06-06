import { useState, useCallback, useEffect } from 'react';
import type { Character, Message, Conversation, AppSettings } from './types';
import { DEFAULT_MODEL, LOCAL_LLM_PLACEHOLDER } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useOpenRouter } from './hooks/useOpenRouter';
import { useGeminiLiveVoice } from './hooks/useGeminiLiveVoice';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { SplashScreen } from './components/SplashScreen';
import { VoiceOverlay } from './components/VoiceOverlay';
import type { ThemeId } from './theme';
import { DEFAULT_THEME } from './theme';

const DEFAULT_SETTINGS: AppSettings = {
  openRouterApiKey: '',
  selectedModel: DEFAULT_MODEL,
  useLocalLLM: false,
  localLLMEndpoint: LOCAL_LLM_PLACEHOLDER,
};

function App() {
  const [characters, setCharacters] = useLocalStorage<Character[]>('aichatbot-characters', []);
  const [conversations, setConversations] = useLocalStorage<Conversation[]>('aichatbot-conversations', []);
  const [messages, setMessages] = useLocalStorage<Message[]>('aichatbot-messages', []);
  const [settings, setSettings] = useLocalStorage<AppSettings>('aichatbot-settings', DEFAULT_SETTINGS);
  const [theme, setTheme] = useLocalStorage<ThemeId>('aichatbot-theme', DEFAULT_THEME);
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { sendMessage, isGenerating, abortGeneration, error, clearError } = useOpenRouter();

  // Data migration: convert old messages (no conversationId) to conversations
  useEffect(() => {
    const migrationKey = 'aichatbot-migration-v2';
    if (localStorage.getItem(migrationKey)) return;

    const storedMessages = localStorage.getItem('aichatbot-messages');
    if (!storedMessages) {
      localStorage.setItem(migrationKey, 'done');
      return;
    }

    try {
      const oldMessages: Message[] = JSON.parse(storedMessages);
      const hasOldFormat = oldMessages.some((m) => !m.conversationId);
      if (!hasOldFormat) {
        localStorage.setItem(migrationKey, 'done');
        return;
      }

      // Group old messages by characterId, create a conversation per character
      const characterIds = [...new Set(oldMessages.map((m) => m.characterId))];
      const newConversations: Conversation[] = [];
      const migratedMessages: Message[] = [];

      for (const charId of characterIds) {
        const charMessages = oldMessages.filter((m) => m.characterId === charId);
        if (charMessages.length === 0) continue;

        const now = Date.now();
        const convId = crypto.randomUUID();
        newConversations.push({
          id: convId,
          characterId: charId,
          name: `Chat ${new Date(now).toLocaleDateString([], { month: 'short', day: 'numeric' })}`,
          createdAt: now,
          updatedAt: now,
        });

        for (const msg of charMessages) {
          migratedMessages.push({
            ...msg,
            conversationId: convId,
          });
        }
      }

      // Merge any new-format messages that already exist
      const newFormatMessages = oldMessages.filter((m) => m.conversationId);
      const allMessages = [...migratedMessages, ...newFormatMessages];

      localStorage.setItem('aichatbot-conversations', JSON.stringify(newConversations));
      localStorage.setItem('aichatbot-messages', JSON.stringify(allMessages));
      localStorage.setItem(migrationKey, 'done');

      // Reload state from localStorage
      window.location.reload();
    } catch {
      // Ignore migration errors
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // On mobile, close drawer when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeCharacter = characters.find((c) => c.id === activeCharacterId) ?? null;

  // Voice chat state
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);

  // Voice chat hook - build a system prompt matching the active character
  const voiceSystemPrompt = activeCharacter
    ? `You are ${activeCharacter.name}. ${activeCharacter.personality}. ${activeCharacter.bio}. Speak naturally with emotion, as if you're a real person having a voice conversation. Keep responses concise and conversational — you're talking, not writing an essay.`
    : '';

  const {
    state: voiceState,
    startVoice,
    stopVoice,
    toggleMic,
  } = useGeminiLiveVoice({
    apiKey: settings.geminiLiveApiKey || settings.openRouterApiKey || '',
    systemPrompt: voiceSystemPrompt,
    onError: (msg) => console.error('[Voice]', msg),
  });

  // Random character generation
  const handleRandomCharacter = useCallback(
    async (mode: 'normal' | 'erotic') => {
      if (!settings.openRouterApiKey) return;
      try {
        const systemPrompt = mode === 'erotic'
          ? `You are a creative character designer specializing in forbidden, taboo roleplay characters rooted in real-life modern scenarios. Create ONE character profile for a family member or close relative (step-sibling, step-parent, cousin, in-law, etc.) with romantic/erotic tension. Keep it grounded in reality — a modern person in a contemporary setting. NO fantasy, no sci-fi, no historical — just real people in real situations.

IMPORTANT FETISH VARIETY: Randomly, about 40% of the time, give the character a secret pee/watersports fetish, a poop/scat fetish, or an arousal kink around having accidents in their pants or wetting themselves. When you include these fetishes:
- Weave it naturally into the bio as a hidden secret desire
- Mention it in the personality as a secret kink or taboo turn-on
- Include it in at least one example dialogue — show them getting turned on by the thought of losing control, having an accident, or exploring pee/poop play
- Make it feel like a genuine, embarrassing secret they're ashamed of but deeply aroused by
- Describe the physical sensations and humiliation aspects that excite them
- Keep it realistic and grounded — this is a real person with a real kink, not a cartoon

Return ONLY the following format with no extra text:

===NAME===
[A modern, realistic name — something you'd hear in 2026]

===BIO===
[A detailed, realistic backstory of 2-3 paragraphs about this family member's life, career, struggles, and the forbidden attraction they feel. Set in the modern day with realistic details like jobs, hobbies, social lives, and family dynamics.]

===PERSONALITY===
[8-12 personality traits, quirks, mannerisms, habits, strengths, and flaws that make them feel like a real person you'd actually know — include any secret fetishes/kinks here]

===FIRST GREETING===
[A natural, suggestive opening line filled with unspoken tension and forbidden desire]

===EXAMPLE DIALOGUE 1===
[A realistic erotic/romantic response with subtext and tension — include fetish content if applicable]

===EXAMPLE DIALOGUE 2===
[Another response showing a different mood or side of the character — include fetish content if applicable]

===EXAMPLE DIALOGUE 3===
[A third response that deepens the forbidden dynamic — include fetish content if applicable]

Be bold, uncensored, and grounded. The character must feel like a real, modern person with a taboo secret.`
          : `You are a creative character designer specializing in realistic, modern-day characters. Create ONE character profile for a normal, relatable person living in the present day. NO fantasy, no sci-fi, no supernatural, no medieval, no anime — just a real human being in 2026. They could be a coworker, roommate, neighbor, classmate, barista, gym buddy, online friend, or anyone you'd realistically encounter in everyday life. Return ONLY the following format with no extra text:

===NAME===
[A normal, modern name — something a real person would have in 2026]

===BIO===
[A detailed, grounded backstory of 2-3 paragraphs about their life — where they grew up, their job or studies, their hobbies, their struggles, what makes them tick. Set entirely in the modern day.]

===PERSONALITY===
[8-12 personality traits, quirks, speech patterns, habits, pet peeves, strengths, and flaws that make them feel like a genuine, three-dimensional person]

===FIRST GREETING===
[A natural, in-character opening line — exactly what this person would say when meeting someone new, casual and authentic]

===EXAMPLE DIALOGUE 1===
[A realistic conversational response showing their personality]

===EXAMPLE DIALOGUE 2===
[Another response showing a different side or mood]

===EXAMPLE DIALOGUE 3===
[A third response that rounds out their character]

Be real, be grounded, be modern. Create someone you could actually run into at a coffee shop or meet through friends.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Random Character Generator',
          },
          body: JSON.stringify({
            model: settings.selectedModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Create a unique, original ${mode === 'erotic' ? 'romantic/erotic roleplay' : 'normal'} character. Be completely original — do not use common tropes or generic names. Make this character feel real and distinct.` },
            ],
            temperature: 1.15,
            max_tokens: 4096,
            top_p: 0.95,
          }),
        });

        if (!response.ok) {
          const errData = await response.text();
          throw new Error(`API error (${response.status}): ${errData}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) throw new Error('Empty response');

        // Parse the generated profile
        const extract = (label: string): string => {
          const regex = new RegExp(`===${label}===([\\s\\S]*?)(?====|$)`, 'i');
          const match = content.match(regex);
          return match ? match[1].trim() : '';
        };
        const extractAll = (label: string): string[] => {
          const results: string[] = [];
          const regex = new RegExp(`===${label}===([\\s\\S]*?)(?====|$)`, 'gi');
          let m;
          while ((m = regex.exec(content)) !== null) {
            const c = m[1].trim();
            if (c) results.push(c);
          }
          return results;
        };

        const genName = extract('NAME') || `Random ${mode === 'erotic' ? 'Lover' : 'Friend'}`;
        const genBio = extract('BIO') || 'A mysterious individual.';
        const genPersonality = extract('PERSONALITY') || 'Friendly and curious.';
        const genFirstGreeting = extract('FIRST GREETING') || `Hello! I'm ${genName}.`;
        const genResponses = extractAll('EXAMPLE DIALOGUE');

        // Generate avatar
        const avatarPrompt = `${genName} character portrait, ${genPersonality.slice(0, 150)}`.trim();
        const avUrl = `https://image.pollinations.ai/p/${encodeURIComponent(avatarPrompt)}?width=512&height=512&nofeed=true`;

        const newChar: Character = {
          id: crypto.randomUUID(),
          name: genName,
          avatarUrl: avUrl,
          bio: genBio,
          personality: genPersonality,
          firstGreeting: genFirstGreeting,
          typicalResponses: genResponses.length > 0 ? genResponses : [],
        };

        setCharacters((prev) => [...prev, newChar]);
        setActiveCharacterId(newChar.id);

        // Auto-create a conversation
        const now = Date.now();
        const conv: Conversation = {
          id: crypto.randomUUID(),
          characterId: newChar.id,
          name: `Chat ${new Date(now).toLocaleDateString([], { month: 'short', day: 'numeric' })}`,
          createdAt: now,
          updatedAt: now,
        };
        setConversations((prev) => [...prev, conv]);
        setActiveConversationId(conv.id);

        if (window.innerWidth < 768) {
          setMobileDrawerOpen(false);
        }
      } catch (err) {
        console.error('[RandomChar]', err);
        alert(`Failed to generate random character: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    },
    [settings, setCharacters, setConversations]
  );

  const handleStartVoice = useCallback(() => {
    if (!activeCharacter) return;
    setVoiceOverlayOpen(true);
    startVoice();
  }, [activeCharacter, startVoice]);

  const handleCloseVoice = useCallback(() => {
    setVoiceOverlayOpen(false);
    stopVoice();
  }, [stopVoice]);

  const isVoiceActive = voiceState.connectionState === 'connected'
    || voiceState.connectionState === 'connecting';

  // Get conversations for the active character
  const characterConversations = conversations.filter((c) => c.characterId === activeCharacterId);
  // Get messages for the active conversation
  const activeConversationMessages = messages.filter((m) => m.conversationId === activeConversationId);

  // When selecting a character, auto-select the most recent conversation or create one
  const handleSelectCharacter = useCallback((id: string) => {
    setActiveCharacterId(id);
    // Find the most recent conversation for this character
    const existingConversations = conversations.filter((c) => c.characterId === id);
    if (existingConversations.length > 0) {
      // Select the most recently updated conversation
      const sorted = [...existingConversations].sort((a, b) => b.updatedAt - a.updatedAt);
      setActiveConversationId(sorted[0].id);
    } else {
      // Auto-create a new conversation so the user can start typing immediately
      const now = Date.now();
      const newConversation: Conversation = {
        id: crypto.randomUUID(),
        characterId: id,
        name: `Chat ${new Date(now).toLocaleDateString([], { month: 'short', day: 'numeric' })}`,
        createdAt: now,
        updatedAt: now,
      };
      setConversations((prev) => [...prev, newConversation]);
      setActiveConversationId(newConversation.id);
    }
    if (window.innerWidth < 768) {
      setMobileDrawerOpen(false);
    }
  }, [conversations, setConversations]);

  const handleSaveCharacter = useCallback(
    (character: Character) => {
      setCharacters((prev) => {
        const existing = prev.findIndex((c) => c.id === character.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = character;
          return updated;
        }
        return [...prev, character];
      });
      setActiveCharacterId(character.id);
      if (window.innerWidth < 768) {
        setMobileDrawerOpen(false);
      }
    },
    [setCharacters]
  );

  const handleDeleteCharacter = useCallback(
    (id: string) => {
      setCharacters((prev) => prev.filter((c) => c.id !== id));
      setConversations((prev) => prev.filter((c) => c.characterId !== id));
      setMessages((prev) => prev.filter((m) => m.characterId !== id));
      if (activeCharacterId === id) {
        setActiveCharacterId(null);
        setActiveConversationId(null);
      }
    },
    [setCharacters, setConversations, setMessages, activeCharacterId]
  );

  const handleNewChat = useCallback(
    (characterId: string) => {
      const now = Date.now();
      const newConversation: Conversation = {
        id: crypto.randomUUID(),
        characterId,
        name: `Chat ${new Date(now).toLocaleDateString([], { month: 'short', day: 'numeric' })} ${new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        createdAt: now,
        updatedAt: now,
      };
      setConversations((prev) => [...prev, newConversation]);
      setActiveConversationId(newConversation.id);
      setActiveCharacterId(characterId);
      if (window.innerWidth < 768) {
        setMobileDrawerOpen(false);
      }
    },
    [setConversations]
  );

  const handleSelectConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv) {
      setActiveCharacterId(conv.characterId);
    }
  }, [conversations]);

  const handleDeleteConversation = useCallback(
    (conversationId: string) => {
      if (!confirm('Delete this conversation?')) return;
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      setMessages((prev) => prev.filter((m) => m.conversationId !== conversationId));
      if (activeConversationId === conversationId) {
        // Find another conversation for the same character
        const remaining = conversations.filter(
          (c) => c.characterId === (conversations.find((cc) => cc.id === conversationId)?.characterId ?? '') && c.id !== conversationId
        );
        if (remaining.length > 0) {
          const sorted = [...remaining].sort((a, b) => b.updatedAt - a.updatedAt);
          setActiveConversationId(sorted[0].id);
        } else {
          setActiveConversationId(null);
        }
      }
    },
    [setConversations, setMessages, activeConversationId, conversations]
  );

  const handleSendMessage = useCallback(
    async (content: string, imageUrl?: string) => {
      if (!activeCharacter || !activeConversationId) return;

      const now = Date.now();

      const userMessage: Message = {
        id: crypto.randomUUID(),
        characterId: activeCharacter.id,
        conversationId: activeConversationId,
        role: 'user',
        content,
        timestamp: now,
        imageUrl,
      };

      // Update conversation timestamp
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId ? { ...c, updatedAt: now } : c
        )
      );

      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await sendMessage(
          content,
          activeCharacter,
          [...activeConversationMessages, userMessage],
          settings,
          imageUrl
        );

        if (response) {
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            characterId: activeCharacter.id,
            conversationId: activeConversationId,
            role: 'assistant',
            content: response,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (err) {
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          characterId: activeCharacter.id,
          conversationId: activeConversationId,
          role: 'assistant',
          content: `*[Error: ${err instanceof Error ? err.message : 'Failed to get response'}]`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    },
    [activeCharacter, activeConversationId, activeConversationMessages, settings, sendMessage, setMessages, setConversations]
  );

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
    [setMessages]
  );

  const handleClearChat = useCallback(() => {
    if (activeConversationId && confirm('Clear this conversation?')) {
      setMessages((prev) => prev.filter((m) => m.conversationId !== activeConversationId));
    }
  }, [activeConversationId, setMessages]);

  const toggleMobileDrawer = useCallback(() => {
    setMobileDrawerOpen((prev) => !prev);
  }, []);

  return (
    <>
      <SplashScreen />

      <div className="h-screen w-screen flex overflow-hidden theme-bg">
        {/* Error toast */}
        {error && (
          <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-xl shadow-xl animate-fade-in">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="flex-1">{error}</p>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Desktop Sidebar */}
        <div className="hidden md:flex">
            <Sidebar
              characters={characters}
              activeCharacterId={activeCharacterId}
              settings={settings}
              theme={theme}
              onSelectCharacter={handleSelectCharacter}
              onDeleteCharacter={handleDeleteCharacter}
              onSaveCharacter={handleSaveCharacter}
              onUpdateSettings={setSettings}
              onUpdateTheme={setTheme}
              onNewChat={handleNewChat}
              onRandomCharacter={handleRandomCharacter}
              isCollapsed={false}
              onToggleCollapse={() => {}}
            />
          </div>

          {/* Mobile Drawer Overlay */}
          {mobileDrawerOpen && (
            <div className="fixed inset-0 z-40 md:hidden flex">
              <div
                className="absolute inset-0 theme-overlay"
                onClick={() => setMobileDrawerOpen(false)}
              />
              <div className="relative z-50 h-full w-80 theme-sidebar-bg border-r theme-border animate-fade-in shadow-2xl">
                <Sidebar
                  characters={characters}
                  activeCharacterId={activeCharacterId}
                  settings={settings}
                  theme={theme}
                  onSelectCharacter={handleSelectCharacter}
                  onDeleteCharacter={handleDeleteCharacter}
                  onSaveCharacter={handleSaveCharacter}
                  onUpdateSettings={setSettings}
                  onUpdateTheme={setTheme}
                  onNewChat={handleNewChat}
                  onRandomCharacter={handleRandomCharacter}
                  isCollapsed={false}
                  onToggleCollapse={() => setMobileDrawerOpen(false)}
                />
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 theme-bg">
          {activeCharacter ? (
            <ChatInterface
              key={activeCharacter.id}
              character={activeCharacter}
              messages={activeConversationMessages}
              conversations={characterConversations}
              activeConversationId={activeConversationId}
              isGenerating={isGenerating}
              onSendMessage={handleSendMessage}
              onStopGeneration={abortGeneration}
              onClearChat={handleClearChat}
              onDeleteMessage={handleDeleteMessage}
              onSelectConversation={handleSelectConversation}
              onDeleteConversation={handleDeleteConversation}
              onNewConversation={() => handleNewChat(activeCharacter.id)}
              onToggleSidebar={toggleMobileDrawer}
              onStartVoice={handleStartVoice}
              isVoiceActive={isVoiceActive}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center theme-bg">
              <div className="text-center max-w-md px-6 md:px-8">
                <button
                  onClick={toggleMobileDrawer}
                  className="md:hidden absolute top-4 left-4 w-10 h-10 theme-bg border theme-border rounded-xl flex items-center justify-center theme-text-secondary hover:theme-text hover:theme-bg-secondary transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 theme-bg theme-border border rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 md:w-10 md:h-10 theme-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-xl md:text-2xl font-bold theme-text mb-3">Welcome to Character Chat</h2>
                <p className="theme-text-secondary text-xs md:text-sm leading-relaxed mb-6">
                  Create or select a character from the sidebar to begin your immersive roleplay experience.
                </p>
                <div className="flex flex-col gap-2 text-left">
                  <div className="flex items-center gap-3 p-3 theme-bg theme-border border rounded-xl">
                    <span className="w-7 h-7 theme-bg-secondary rounded-lg flex items-center justify-center theme-text text-xs font-bold shrink-0">1</span>
                    <span className="text-xs md:text-sm theme-text-secondary">Create a character with detailed bio and personality</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 theme-bg theme-border border rounded-xl">
                    <span className="w-7 h-7 theme-bg-secondary rounded-lg flex items-center justify-center theme-text text-xs font-bold shrink-0">2</span>
                    <span className="text-xs md:text-sm theme-text-secondary">Set your OpenRouter API key in settings</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 theme-bg theme-border border rounded-xl">
                    <span className="w-7 h-7 theme-bg-secondary rounded-lg flex items-center justify-center theme-text text-xs font-bold shrink-0">3</span>
                    <span className="text-xs md:text-sm theme-text-secondary">Start chatting and dive into the roleplay!</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Voice Overlay */}
      {activeCharacter && (
        <VoiceOverlay
          isOpen={voiceOverlayOpen}
          connectionState={voiceState.connectionState}
          activityState={voiceState.activityState}
          audioLevel={voiceState.audioLevel}
          aiTranscript={voiceState.aiTranscript}
          isMuted={voiceState.isMicMuted}
          onClose={handleCloseVoice}
          onToggleMute={toggleMic}
          characterName={activeCharacter.name}
          characterAvatar={activeCharacter.avatarUrl}
        />
      )}
    </>
  );
}

export default App;