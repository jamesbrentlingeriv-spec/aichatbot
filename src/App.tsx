import { useState, useCallback, useEffect } from 'react';
import type { Character, Message, AppSettings } from './types';
import { DEFAULT_MODEL } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useOpenRouter } from './hooks/useOpenRouter';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { SplashScreen } from './components/SplashScreen';
import type { ThemeId } from './theme';
import { DEFAULT_THEME } from './theme';

const DEFAULT_SETTINGS: AppSettings = {
  openRouterApiKey: '',
  selectedModel: DEFAULT_MODEL,
};

function App() {
  const [characters, setCharacters] = useLocalStorage<Character[]>('aichatbot-characters', []);
  const [messages, setMessages] = useLocalStorage<Message[]>('aichatbot-messages', []);
  const [settings, setSettings] = useLocalStorage<AppSettings>('aichatbot-settings', DEFAULT_SETTINGS);
  const [theme, setTheme] = useLocalStorage<ThemeId>('aichatbot-theme', DEFAULT_THEME);
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { sendMessage, isGenerating, abortGeneration, error } = useOpenRouter();

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

  const handleSelectCharacter = useCallback((id: string) => {
    setActiveCharacterId(id);
    if (window.innerWidth < 768) {
      setMobileDrawerOpen(false);
    }
  }, []);

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
      setMessages((prev) => prev.filter((m) => m.characterId !== id));
      if (activeCharacterId === id) {
        setActiveCharacterId(null);
      }
    },
    [setCharacters, setMessages, activeCharacterId]
  );

  const handleNewChat = useCallback(
    (characterId: string) => {
      setMessages((prev) => prev.filter((m) => m.characterId !== characterId));
      setActiveCharacterId(characterId);
      if (window.innerWidth < 768) {
        setMobileDrawerOpen(false);
      }
    },
    [setMessages]
  );

  const handleSendMessage = useCallback(
    async (content: string, imageUrl?: string) => {
      if (!activeCharacter) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        characterId: activeCharacter.id,
        role: 'user',
        content,
        timestamp: Date.now(),
        imageUrl,
      };

      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await sendMessage(
          content,
          activeCharacter,
          [...messages, userMessage],
          settings,
          imageUrl
        );

        if (response) {
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            characterId: activeCharacter.id,
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
          role: 'assistant',
          content: `*[Error: ${err instanceof Error ? err.message : 'Failed to get response'}]`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    },
    [activeCharacter, messages, settings, sendMessage, setMessages]
  );

  const handleClearChat = useCallback(() => {
    if (activeCharacter && confirm('Clear this conversation?')) {
      setMessages((prev) => prev.filter((m) => m.characterId !== activeCharacter.id));
    }
  }, [activeCharacter, setMessages]);

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
                onClick={() => setSettings({ ...settings })}
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
              messages={messages}
              isGenerating={isGenerating}
              onSendMessage={handleSendMessage}
              onStopGeneration={abortGeneration}
              onClearChat={handleClearChat}
              onToggleSidebar={toggleMobileDrawer}
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
    </>
  );
}

export default App;