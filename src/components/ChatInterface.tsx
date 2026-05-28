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
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('Image must be under 10MB.'); return; }
    setAttachedFile(file);
    const preview = URL.createObjectURL(file);
    setAttachedPreview(preview);
  };

  const handleRemoveAttachment = () => {
    if (attachedPreview) URL.revokeObjectURL(attachedPreview);
    setAttachedFile(null);
    setAttachedPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !attachedFile) return;
    let finalImageUrl: string | undefined;
    if (attachedFile) {
      finalImageUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(attachedFile);
      });
    }
    onSendMessage(input.trim(), finalImageUrl);
    setInput('');
    handleRemoveAttachment();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const characterMessages = messages.filter((m) => m.characterId === character.id);

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 theme-bg">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4 border-b theme-border theme-header-bg shrink-0 min-h-14">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center theme-text-secondary hover:theme-text hover:theme-bg-secondary transition-colors shrink-0"
            title="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img
            src={character.avatarUrl}
            alt={character.name}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover border-2 theme-border shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(character.name)}&background=18181b&color=fff&size=80`;
            }}
          />
          <div className="min-w-0">
            <h2 className="text-sm md:text-base font-bold theme-text truncate">{character.name}</h2>
            <p className="text-[11px] md:text-xs theme-text-tertiary truncate">
              {characterMessages.length} message{characterMessages.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          {characterMessages.length > 0 && (
            <button
              onClick={onClearChat}
              className="px-2.5 md:px-3 py-1.5 text-[11px] md:text-xs theme-text-tertiary hover:text-red-400 theme-bg hover:bg-red-950 border theme-border hover:border-red-800 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll px-3 md:px-4 py-3 md:py-4 pb-56 md:pb-4 space-y-3 md:space-y-4">
        {characterMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 md:px-8">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full theme-bg border theme-border flex items-center justify-center mb-4">
              <img src={character.avatarUrl} alt={character.name} className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(character.name)}&background=18181b&color=fff&size=64`; }}
              />
            </div>
            <h3 className="text-base md:text-lg font-bold theme-text mb-2">{character.name}</h3>
            <p className="theme-text-secondary text-xs md:text-sm max-w-md">{character.firstGreeting}</p>
            <p className="theme-text-tertiary text-[11px] md:text-xs mt-4">Type a message below to start the conversation</p>
          </div>
        )}

        {characterMessages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-2 md:gap-3 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className="shrink-0">
              {msg.role === 'assistant' ? (
                <img src={character.avatarUrl} alt={character.name} className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover border theme-border"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(character.name)}&background=18181b&color=fff&size=32`; }}
                />
              ) : (
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full theme-accent-bg flex items-center justify-center theme-accent-text text-[10px] md:text-xs font-bold">U</div>
              )}
            </div>
            <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl overflow-hidden ${msg.role === 'user' ? 'theme-user-bubble theme-user-bubble-text rounded-tr-md' : 'theme-ai-bubble border theme-ai-bubble-border theme-ai-bubble-text rounded-tl-md'}`}>
              {msg.imageUrl && (
                <div className="w-full">
                  <img src={msg.imageUrl} alt="Attached" className="w-full h-auto max-h-75 object-cover" loading="lazy" />
                </div>
              )}
              {msg.content && (
                <div className="px-3 md:px-4 py-2.5 md:py-3">
                  <p className="text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">{msg.content}</p>
                  <p className={`text-[10px] md:text-xs mt-1 ${msg.role === 'user' ? 'opacity-60' : 'theme-text-tertiary'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="flex items-start gap-2 md:gap-3 animate-fade-in">
            <img src={character.avatarUrl} alt={character.name} className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover border theme-border shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(character.name)}&background=18181b&color=fff&size=32`; }}
            />
            <div className="theme-ai-bubble border theme-ai-bubble-border rounded-2xl rounded-tl-md px-3 md:px-4 py-3">
              <div className="flex gap-1.5">
                <span className="typing-dot w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" />
                <span className="typing-dot w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" />
                <span className="typing-dot w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Input Area */}
      <div className="sticky bottom-0 left-0 right-0 border-t theme-border theme-bg px-2 md:px-4 py-2 md:py-3 shrink-0 z-10">
        {attachedPreview && (
          <div className="mb-2 flex items-start gap-2 p-2 theme-bg-secondary border theme-border rounded-xl animate-fade-in">
            <img src={attachedPreview} alt="Attachment preview" className="w-16 h-16 rounded-lg object-cover border theme-border shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs theme-text-secondary truncate">{attachedFile?.name ?? 'Image attached'}</p>
              <p className="text-[10px] theme-text-tertiary mt-0.5">{attachedFile ? `${(attachedFile.size / 1024).toFixed(1)} KB` : ''}</p>
            </div>
            <button type="button" onClick={handleRemoveAttachment} className="theme-text-tertiary hover:text-red-400 transition-colors p-1" title="Remove attachment">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-1.5 md:gap-2">
          <div className="flex flex-col gap-0.5 md:gap-1 pb-0.5">
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className={`w-11 h-10 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-colors ${attachedFile ? 'theme-bg-secondary theme-text' : 'theme-text-tertiary hover:theme-text hover:theme-bg-secondary'}`}
              title="Upload a photo">
              <svg className="w-4 h-4 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          <div className="flex-1 relative">
            <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={`Chat with ${character.name}...`} rows={1}
              className="w-full theme-input-bg border theme-input-border rounded-xl px-3 md:px-4 py-3 md:py-2.5 text-sm theme-text placeholder:theme-text-tertiary focus:outline-none focus:ring-2 focus:ring-(--accent) focus:border-(--accent) transition-all resize-none max-h-30 min-h-12 md:min-h-0"
            />
          </div>
          <div className="pb-0.5">
            {isGenerating ? (
              <button type="button" onClick={onStopGeneration} className="w-11 h-11 md:w-10 md:h-10 bg-red-900 hover:bg-red-800 text-red-300 rounded-xl flex items-center justify-center transition-colors border border-red-800" title="Stop generating">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
              </button>
            ) : (
              <button type="submit" disabled={!input.trim() && !attachedFile}
                className="w-11 h-11 md:w-10 md:h-10 theme-accent-bg hover:opacity-90 disabled:theme-bg-tertiary disabled:theme-text-tertiary theme-accent-text rounded-xl flex items-center justify-center transition-all duration-200 disabled:cursor-not-allowed" title="Send message">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" /></svg>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}