import { useState, useEffect } from 'react';

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      // After the fade-out transition completes, unmount
      setTimeout(() => setVisible(false), 300);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] theme-splash-bg flex items-center justify-center transition-opacity duration-500 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="w-[64px] h-[64px] md:w-[80px] md:h-[80px] rounded-2xl theme-accent-bg flex items-center justify-center shadow-2xl">
          <svg className="w-10 h-10 md:w-12 md:h-12 theme-accent-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold theme-text tracking-tight">Character Chat</h1>
          <p className="theme-text-secondary text-sm mt-1">Immersive Roleplay</p>
        </div>
        <div className="flex gap-1.5 mt-2">
          <span className="w-1.5 h-1.5 theme-text-tertiary rounded-full animate-pulse" />
          <span className="w-1.5 h-1.5 theme-text-tertiary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <span className="w-1.5 h-1.5 theme-text-tertiary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
}