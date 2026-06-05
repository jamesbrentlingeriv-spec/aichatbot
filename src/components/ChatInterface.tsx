import { useState, useRef, useEffect } from 'react';
import type { Character, Message, Conversation } from '../types';

interface ChatInterfaceProps {
  character: Character;
  messages: Message[];
  conversations: Conversation[];
  activeConversationId: string | null;
  isGenerating: boolean;
  onSendMessage: (content: string, imageUrl?: string) => void;
  onStopGeneration: () => void;
  onClearChat: () => void;
  onDeleteMessage: (messageId: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onToggleSidebar?: () => void;
  onStartVoice?: () => void;
  isVoiceActive?: boolean;
}

// Conversation tab component
function ConversationTab({
  conv,
  isActive,
  onSelect,
  onDelete,
}: {
  conv: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group relative flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 whitespace-nowrap shrink-0 ${
        isActive
          ? 'theme-bg-secondary theme-text border theme-border shadow-sm'
          : 'theme-text-tertiary hover:theme-text hover:theme-bg-secondary border border-transparent'
      }`}
      onClick={onSelect}
    >
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
      <span className="truncate max-w-24 md:max-w-32">{conv.name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="ml-1 w-4 h-4 opacity-0 group-hover:opacity-100 hover:bg-red-950 rounded flex items-center justify-center text-red-500 hover:text-red-400 transition-all duration-200"
        title="Delete conversation"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// Typing indicator with animated dots
function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 md:gap-3 animate-fade-in">
      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full theme-bg-secondary border theme-border flex items-center justify-center shrink-0">
        <svg className="w-3.5 h-3.5 md:w-4 md:h-4 theme-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
      <div className="theme-ai-bubble border theme-ai-bubble-border rounded-2xl rounded-tl-md px-3 md:px-4 py-3">
        <div className="flex gap-1.5">
          <span className="typing-dot w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" />
          <span className="typing-dot w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" />
          <span className="typing-dot w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Detect if a message references past context
function hasContextualMarkers(text: string): boolean {
  const patterns = [
    /(?:as you said|as you mentioned|like you said|like you mentioned|you told me|you mentioned|earlier before|remember when|you said before|previously|last time|back when|the other day)/i,
    /(?:oh right|oh yeah|that's right|oh that|ah yes|right you did|right you are)/i,
  ];
  return patterns.some(p => p.test(text));
}

export function ChatInterface({
  character,
  messages,
  conversations,
  activeConversationId,
  isGenerating,
  onSendMessage,
  onStopGeneration,
  onClearChat,
  onDeleteMessage,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
  onToggleSidebar,
  onStartVoice,
  isVoiceActive,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  // Typewriter state
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [streamingRevealed, setStreamingRevealed] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStreamedIdRef = useRef<string | null>(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating, streamingRevealed, streamingMsgId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  // Initialize typewriter when a new assistant message arrives
  useEffect(() => {
    if (!isGenerating) {
      lastStreamedIdRef.current = null;
      // Cleanup streaming state via microtask to avoid direct setState in effect
      queueMicrotask(() => {
        setStreamingMsgId(null);
        setStreamingRevealed(0);
      });
      return;
    }
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.content) return;
    if (lastStreamedIdRef.current === lastMsg.id) return;

    lastStreamedIdRef.current = lastMsg.id;
    setStreamingMsgId(lastMsg.id);
    setStreamingRevealed(1);

    if (streamingTimerRef.current) clearInterval(streamingTimerRef.current);

    const targetContent = lastMsg.content;
    const timer = setInterval(() => {
      setStreamingRevealed(prev => {
        const next = prev + Math.floor(Math.random() * 4) + 1;
        if (next >= targetContent.length) {
          clearInterval(timer);
          streamingTimerRef.current = null;
          return targetContent.length;
        }
        return next;
      });
    }, 20 + Math.random() * 15);
    streamingTimerRef.current = timer;

    return () => {
      clearInterval(timer);
      streamingTimerRef.current = null;
    };
  }, [isGenerating, messages, messages.length]);

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

  const sortedConversations = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

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
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          {onStartVoice && (
            <button
              onClick={onStartVoice}
              className={`px-2.5 md:px-3 py-1.5 text-[11px] md:text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                isVoiceActive
                  ? 'bg-green-900 text-green-300 border border-green-800 hover:bg-green-800'
                  : 'theme-text-tertiary hover:text-white theme-bg hover:bg-blue-950 border theme-border hover:border-blue-800'
              }`}
              title={isVoiceActive ? 'Voice call active' : 'Start voice call'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {isVoiceActive ? 'Voice' : 'Voice'}
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={onClearChat}
              className="px-2.5 md:px-3 py-1.5 text-[11px] md:text-xs theme-text-tertiary hover:text-red-400 theme-bg hover:bg-red-950 border theme-border hover:border-red-800 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Conversation tabs */}
      {conversations.length > 0 && (
        <div className="flex items-center gap-1 px-2 md:px-3 py-2 border-b theme-border overflow-x-auto shrink-0">
          {sortedConversations.map((conv) => (
            <ConversationTab
              key={conv.id}
              conv={conv}
              isActive={activeConversationId === conv.id}
              onSelect={() => onSelectConversation(conv.id)}
              onDelete={() => onDeleteConversation(conv.id)}
            />
          ))}
          <button
            onClick={onNewConversation}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium theme-text-tertiary hover:theme-text hover:theme-bg-secondary border border-transparent transition-colors whitespace-nowrap shrink-0"
            title="New conversation"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll px-3 md:px-4 py-3 md:py-4 pb-56 md:pb-4 space-y-3 md:space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 md:px-8 animate-fade-in">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full theme-bg border theme-border flex items-center justify-center mb-4">
              <img src={character.avatarUrl} alt={character.name} className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(character.name)}&background=18181b&color=fff&size=64`; }}
              />
            </div>
            <h3 className="text-base md:text-lg font-bold theme-text mb-2">{character.name}</h3>
            <p className="theme-text-secondary text-xs md:text-sm max-w-md italic">"{character.firstGreeting}"</p>
            <p className="theme-text-tertiary text-[11px] md:text-xs mt-4">Type a message below to start the conversation</p>
          </div>
        )}

        {messages.map((msg) => {
          // Check if this message is currently being streamed
          const isStreaming = isGenerating && streamingMsgId === msg.id;
          const displayContent = isStreaming
            ? msg.content.slice(0, streamingRevealed)
            : msg.content;
          const isContextual = msg.role === 'assistant' && hasContextualMarkers(msg.content);

          return (
            <div key={msg.id} className="group flex items-start gap-2 md:gap-3 animate-fade-in relative">
              <div className={`flex items-start gap-2 md:gap-3 w-full ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="shrink-0">
                  {msg.role === 'assistant' ? (
                    <img src={character.avatarUrl} alt={character.name} className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover border theme-border"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(character.name)}&background=18181b&color=fff&size=32`; }}
                    />
                  ) : (
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full theme-accent-bg flex items-center justify-center theme-accent-text text-[10px] md:text-xs font-bold">U</div>
                  )}
                </div>
                <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl overflow-hidden ${
                  msg.role === 'user' 
                    ? 'theme-user-bubble theme-user-bubble-text rounded-tr-md' 
                    : 'theme-ai-bubble border theme-ai-bubble-border theme-ai-bubble-text rounded-tl-md'
                }`}>
                  {msg.imageUrl && (
                    <div className="w-full">
                      <img src={msg.imageUrl} alt="Attached" className="w-full h-auto max-h-75 object-cover" loading="lazy" />
                    </div>
                  )}
                  {(displayContent || isStreaming) && (
                    <div className="px-3 md:px-4 py-2.5 md:py-3">
                      {/* Contextual memory badge */}
                      {isContextual && !isStreaming && (
                        <div className="flex items-center gap-1 mb-1.5">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-900/40 text-purple-300 border border-purple-800/50">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            remembering
                          </span>
                        </div>
                      )}
                      <p className="text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
                        {displayContent}
                        {isStreaming && (
                          <span className="inline-block w-0.5 h-4 ml-0.5 bg-current animate-pulse align-text-bottom" />
                        )}
                      </p>
                      <p className={`text-[10px] md:text-xs mt-1 ${msg.role === 'user' ? 'opacity-60' : 'theme-text-tertiary'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Delete this message?')) onDeleteMessage(msg.id);
                }}
                className="absolute top-0 right-0 w-6 h-6 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-red-950 hover:bg-red-900 rounded-md flex items-center justify-center text-red-500 hover:text-red-400"
                title="Delete message"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          );
        })}

        {isGenerating && (
          <>
            {(!streamingMsgId || !messages[messages.length - 1]?.content) && <TypingIndicator />}
          </>
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
              placeholder={activeConversationId ? `Chat with ${character.name}...` : 'Start a new conversation first'}
              rows={1}
              disabled={!activeConversationId}
              className="w-full theme-input-bg border theme-input-border rounded-xl px-3 md:px-4 py-3 md:py-2.5 text-sm theme-text placeholder:theme-text-tertiary focus:outline-none focus:ring-2 focus:ring-(--accent) focus:border-(--accent) transition-all resize-none max-h-30 min-h-12 md:min-h-0 disabled:opacity-50"
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