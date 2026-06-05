import type { VoiceConnectionState, VoiceActivityState } from '../types';

// Pre-computed heights for audio bars to avoid impure function during render
const BAR_HEIGHTS = Array.from({ length: 20 }, () => 30 + Math.floor(Math.random() * 70));

interface VoiceOverlayProps {
  isOpen: boolean;
  connectionState: VoiceConnectionState;
  activityState: VoiceActivityState;
  audioLevel: number;
  aiTranscript: string;
  isMuted: boolean;
  onClose: () => void;
  onToggleMute: () => void;
  characterName: string;
  characterAvatar: string;
}

export function VoiceOverlay({
  isOpen,
  connectionState,
  activityState,
  audioLevel,
  aiTranscript,
  isMuted,
  onClose,
  onToggleMute,
  characterName,
  characterAvatar,
}: VoiceOverlayProps) {
  if (!isOpen) return null;

  const statusLabel = connectionState === 'connected'
    ? activityState === 'listening' ? 'Listening...' 
    : activityState === 'speaking' ? 'Speaking...'
    : 'Connected'
    : connectionState === 'connecting' ? 'Connecting...'
    : connectionState === 'error' ? 'Connection Error'
    : 'Disconnected';

  const statusColor = connectionState === 'connected'
    ? activityState === 'listening' ? 'text-blue-400'
    : activityState === 'speaking' ? 'text-green-400'
    : 'text-zinc-400'
    : connectionState === 'connecting' ? 'text-yellow-400'
    : connectionState === 'error' ? 'text-red-400'
    : 'text-zinc-600';

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-6 animate-fade-in">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all flex items-center justify-center"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Avatar with glow */}
      <div className="relative">
        <div className={`absolute inset-0 rounded-full blur-xl opacity-50 transition-all duration-500 ${
          activityState === 'speaking' ? 'bg-green-500 scale-125' :
          activityState === 'listening' ? 'bg-blue-500 scale-110' :
          'bg-zinc-500 scale-100'
        }`} />
        <img
          src={characterAvatar}
          alt={characterName}
          className="relative w-24 h-24 rounded-full object-cover border-2 border-zinc-700"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(characterName)}&background=18181b&color=fff&size=128`;
          }}
        />
      </div>

      {/* Character name */}
      <h2 className="text-2xl font-bold text-white">{characterName}</h2>

      {/* Connection status */}
      <div className="flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${
          connectionState === 'connected' ? activityState === 'speaking' ? 'bg-green-500 animate-pulse' : 'bg-green-500'
          : connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse'
          : 'bg-red-500'
        }`} />
        <span className={`text-sm font-medium ${statusColor}`}>{statusLabel}</span>
      </div>

      {/* Audio level indicator */}
      {connectionState === 'connected' && (
        <div className="flex items-end gap-0.5 h-8">
          {Array.from({ length: 20 }).map((_, i) => {
            const threshold = i / 20;
            const active = audioLevel > threshold;
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-100 ${
                  active ? 'bg-blue-400' : 'bg-zinc-700'
                }`}
                style={{ height: `${active ? BAR_HEIGHTS[i] : 15}%` }}
              />
            );
          })}
        </div>
      )}

      {/* AI transcript */}
      {aiTranscript && (
        <div className="max-w-md text-center px-6">
          <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3">{aiTranscript}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Mute button */}
        <button
          onClick={onToggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isMuted
              ? 'bg-red-900 text-red-400 border border-red-800'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMuted ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            )}
          </svg>
        </button>

        {/* End call button */}
        <button
          onClick={onClose}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-lg shadow-red-600/25"
          title="End call"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1.003 1.003 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.01l-2.2 2.21z" />
          </svg>
        </button>
      </div>
    </div>
  );
}