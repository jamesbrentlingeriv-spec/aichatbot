import { useState, useRef, useEffect } from 'react';
import type { Character, Message } from '../types';

interface ChatInterfaceProps {
  character: Character;
  messages: Message[];
  isGenerating: boolean;
  onSendMessage: (content: string, imageUrl?: string) => void;
  onStopGeneration: () => void;
  onClearChat: () => void;
  onToggleSidebar?: () => void;
}

export function ChatInterface({
  character,
  messages,
  isGenerating,
  onSendMessage,
  onStopGeneration,
  onClearChat,
  onToggleSidebar,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !imageUrl) return;
    onSendMessage(input.trim(), imageUrl || undefined);
    setInput('');
    setImageUrl('');
    setShowImageInput(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Generate image via Pollinations
  const generateImage = async () => {
    if (!input.trim()) return;
    const prompt = encodeURIComponent(input.trim());
    const url = `https://image.pollinations.ai/p/${prompt}?width=1024&height=768&nofeed=true`;
    setGeneratedImageUrl(url);
    setImageUrl(url);
  };

  const characterMessages = messages.filter((m) => m.characterId === character.id);

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-black">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4 border-b border-zinc-800 bg-black shrink-0 min-h-[56px]">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {/* Mobile hamburger back to sidebar */}
          <button
            onClick={onToggleSidebar}
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors shrink-0"
            title="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img
            src={character.avatarUrl}
            alt={character.name}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover border-2 border-zinc-700 shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(character.name)}&background=18181b&color=fff&size=80`;
            }}
          />
          <div className="min-w-0">
            <h2 className="text-sm md:text-base font-bold text-white truncate">{character.name}</h2>
            <p className="text-[11px] md:text-xs text-zinc-500 truncate">
              {characterMessages.length} message{characterMessages.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {characterMessages.length > 0 && (
            <button
              onClick={onClearChat}
              className="px-2.5 md:px-3 py-1.5 text-[11px] md:text-xs text-zinc-500 hover:text-red-400 bg-black hover:bg-red-950 border border-zinc-800 hover:border-red-800 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages Area - with bottom padding for fixed input */}
      <div className="flex-1 overflow-y-auto chat-scroll px-3 md:px-4 py-3 md:py-4 pb-56 md:pb-4 space-y-3 md:space-y-4">
        {characterMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 md:px-8">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-black border border-zinc-800 flex items-center justify-center mb-4">
              <img
                src={character.avatarUrl}
                alt={character.name}
                className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(character.name)}&background=18181b&color=fff&size=64`;
                }}
              />
            </div>
            <h3 className="text-base md:text-lg font-bold text-white mb-2">{character.name}</h3>
            <p className="text-zinc-400 text-xs md:text-sm max-w-md">
              {character.firstGreeting}
            </p>
            <p className="text-zinc-700 text-[11px] md:text-xs mt-4">Type a message below to start the conversation</p>
          </div>
        )}

        {characterMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2 md:gap-3 animate-fade-in ${
              msg.role === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div className="shrink-0">
              {msg.role === 'assistant' ? (
                <img
                  src={character.avatarUrl}
                  alt={character.name}
                  className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover border border-zinc-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(character.name)}&background=18181b&color=fff&size=32`;
                  }}
                />
              ) : (
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white flex items-center justify-center text-black text-[10px] md:text-xs font-bold">
                  U
                </div>
              )}
            </div>

            {/* Message Bubble */}
            <div
              className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-3 md:px-4 py-2.5 md:py-3 ${
                msg.role === 'user'
                  ? 'bg-white text-black rounded-tr-md'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-tl-md'
              }`}
            >
              <p className="text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
              <p
                className={`text-[10px] md:text-xs mt-1 ${
                  msg.role === 'user' ? 'text-zinc-500' : 'text-zinc-600'
                }`}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isGenerating && (
          <div className="flex items-start gap-2 md:gap-3 animate-fade-in">
            <img
              src={character.avatarUrl}
              alt={character.name}
              className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover border border-zinc-700 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(character.name)}&background=18181b&color=fff&size=32`;
              }}
            />
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-md px-3 md:px-4 py-3">
              <div className="flex gap-1.5">
                <span className="typing-dot w-1.5 h-1.5 md:w-2 md:h-2 bg-zinc-500 rounded-full" />
                <span className="typing-dot w-1.5 h-1.5 md:w-2 md:h-2 bg-zinc-500 rounded-full" />
                <span className="typing-dot w-1.5 h-1.5 md:w-2 md:h-2 bg-zinc-500 rounded-full" />
              </div>
            </div>
          </div>
        )}

        {/* Generated image display */}
        {generatedImageUrl && (
          <div className="flex items-start gap-2 md:gap-3 animate-fade-in flex-row-reverse">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white flex items-center justify-center text-black text-[10px] md:text-xs font-bold shrink-0">
              U
            </div>
            <div className="max-w-[85%] md:max-w-[75%] rounded-2xl overflow-hidden border border-zinc-700 shadow-lg">
              <img
                src={generatedImageUrl}
                alt="Generated illustration"
                className="w-full h-auto"
                loading="lazy"
              />
              <div className="bg-black px-3 py-2 text-[10px] md:text-xs text-zinc-500">
                Generated scene illustration
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Input Area - sticky to bottom on all screens */}
      <div className="sticky bottom-0 left-0 right-0 border-t border-zinc-800 bg-black px-2 md:px-4 py-2 md:py-3 shrink-0 z-10">
        {/* Image URL input */}
        {showImageInput && (
          <div className="mb-2 flex gap-2">
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Paste image URL to include..."
              className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-500 transition-all"
            />
            <button
              type="button"
              onClick={() => {
                setShowImageInput(false);
                setImageUrl('');
              }}
              className="px-2 py-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-1.5 md:gap-2">
          {/* Action buttons */}
          <div className="flex flex-col gap-0.5 md:gap-1 pb-0.5">
            <button
              type="button"
              onClick={() => setShowImageInput(!showImageInput)}
              className={`w-11 h-10 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-colors ${
                showImageInput
                  ? 'bg-zinc-800 text-zinc-300'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
              }`}
              title="Attach image URL"
            >
              <svg className="w-4 h-4 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={generateImage}
              disabled={!input.trim()}
              className="w-11 h-10 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Generate image from prompt"
            >
              <svg className="w-4 h-4 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Chat with ${character.name}...`}
              rows={1}
              className="w-full bg-black border border-zinc-700 rounded-xl px-3 md:px-4 py-3 md:py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-500 transition-all resize-none max-h-[120px] min-h-[48px] md:min-h-0"
            />
          </div>

          {/* Send/Stop button */}
          <div className="pb-0.5">
            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="w-11 h-11 md:w-10 md:h-10 bg-red-900 hover:bg-red-800 text-red-300 rounded-xl flex items-center justify-center transition-colors border border-red-800"
                title="Stop generating"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && !imageUrl}
                className="w-11 h-11 md:w-10 md:h-10 bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-black rounded-xl flex items-center justify-center transition-all duration-200 disabled:cursor-not-allowed"
                title="Send message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}