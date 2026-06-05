import { useState } from 'react';
import type { Character, AppSettings } from '../types';
import { AVAILABLE_MODELS, LOCAL_LLM_PLACEHOLDER } from '../types';
import { CharacterForm } from './CharacterForm';
import type { ThemeId } from '../theme';
import { THEMES } from '../theme';

interface SidebarProps {
  characters: Character[];
  activeCharacterId: string | null;
  settings: AppSettings;
  theme: ThemeId;
  onSelectCharacter: (id: string) => void;
  onDeleteCharacter: (id: string) => void;
  onSaveCharacter: (character: Character) => void;
  onUpdateSettings: (settings: AppSettings) => void;
  onUpdateTheme: (theme: ThemeId) => void;
  onNewChat: (characterId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  characters,
  activeCharacterId,
  settings,
  theme,
  onSelectCharacter,
  onDeleteCharacter,
  onSaveCharacter,
  onUpdateSettings,
  onUpdateTheme,
  onNewChat,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleSave = (character: Character) => {
    onSaveCharacter(character);
    setShowCreateForm(false);
    setEditingCharacter(null);
  };

  const startEdit = (char: Character) => {
    setEditingCharacter(char);
    setShowCreateForm(true);
  };

  return (
    <>
      {isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="fixed top-4 left-4 z-50 w-10 h-10 theme-bg border theme-border rounded-xl flex items-center justify-center theme-text-secondary hover:theme-text hover:theme-bg-secondary transition-all shadow-lg"
          title="Open sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      <aside
        className={`h-full theme-sidebar-bg border-r theme-border flex flex-col transition-all duration-300 overflow-hidden ${
          isCollapsed ? 'w-0 border-r-0' : 'w-80'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b theme-border shrink-0 min-w-0 theme-header-bg">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 theme-bg-secondary border theme-border rounded-lg flex items-center justify-center theme-text text-xs font-bold shrink-0">
              AI
            </div>
            <h1 className="text-sm font-bold theme-text truncate">Character Chat</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                showSettings ? 'theme-bg-secondary theme-text' : 'theme-text-tertiary hover:theme-text hover:theme-bg-secondary'
              }`}
              title="Settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={onToggleCollapse}
              className="w-7 h-7 rounded-lg flex items-center justify-center theme-text-tertiary hover:theme-text hover:theme-bg-secondary transition-colors"
              title="Close sidebar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="px-4 py-3 border-b theme-border space-y-3 shrink-0">
            {/* Local LLM Toggle */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.useLocalLLM}
                  onChange={(e) => onUpdateSettings({ ...settings, useLocalLLM: e.target.checked })}
                  className="w-4 h-4 theme-accent-bg border theme-border rounded"
                />
                <span className="text-xs font-semibold theme-text">Use Local LLM (PocketPal/llama.cpp)</span>
              </label>
            </div>

            {settings.useLocalLLM && (
              <div>
                <label className="block text-xs font-semibold theme-text-tertiary mb-1 uppercase tracking-wider">
                  Local LLM Endpoint
                </label>
                <input
                  type="text"
                  value={settings.localLLMEndpoint || ''}
                  onChange={(e) => onUpdateSettings({ ...settings, localLLMEndpoint: e.target.value })}
                  placeholder={LOCAL_LLM_PLACEHOLDER}
                  className="w-full theme-input-bg border theme-input-border rounded-lg px-3 py-2 text-sm theme-text placeholder:theme-text-tertiary focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all"
                />
                <p className="text-xs theme-text-tertiary mt-1">e.g., http://127.0.0.1:8080/completion</p>
              </div>
            )}

            {/* Theme Picker */}
            <div>
              <label className="block text-xs font-semibold theme-text-tertiary mb-1 uppercase tracking-wider">
                Theme
              </label>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onUpdateTheme(t.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                      theme === t.id
                        ? 'theme-accent-bg theme-accent-text'
                        : 'theme-bg border theme-border theme-text-secondary hover:theme-bg-secondary'
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {!settings.useLocalLLM && (
              <>
                <div>
                  <label className="block text-xs font-semibold theme-text-tertiary mb-1 uppercase tracking-wider">
                    OpenRouter API Key
                  </label>
                  <input
                    type="password"
                    value={settings.openRouterApiKey}
                    onChange={(e) => onUpdateSettings({ ...settings, openRouterApiKey: e.target.value })}
                    placeholder="sk-or-v1-..."
                    className="w-full theme-input-bg border theme-input-border rounded-lg px-3 py-2 text-sm theme-text placeholder:theme-text-tertiary focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold theme-text-tertiary mb-1 uppercase tracking-wider">
                    Model
                  </label>
                  <select
                    value={settings.selectedModel}
                    onChange={(e) => onUpdateSettings({ ...settings, selectedModel: e.target.value })}
                    className="w-full theme-input-bg border theme-input-border rounded-lg px-3 py-2 text-sm theme-text focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-all"
                  >
                    {AVAILABLE_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        {/* Character list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {characters.length === 0 && !showCreateForm && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🤖</div>
              <p className="theme-text-secondary text-sm">No characters yet</p>
              <p className="theme-text-tertiary text-xs mt-1">Create your first character to begin</p>
            </div>
          )}

          {characters.map((char) => (
            <div
              key={char.id}
              className={`group relative rounded-xl p-3 cursor-pointer transition-all duration-200 ${
                activeCharacterId === char.id
                  ? 'theme-bg-secondary border theme-border'
                  : 'theme-bg border theme-border hover:theme-bg-secondary'
              }`}
              onClick={() => onSelectCharacter(char.id)}
            >
              <div className="flex items-center gap-3">
                <img
                  src={char.avatarUrl}
                  alt={char.name}
                  className="w-10 h-10 rounded-full object-cover border theme-border shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(char.name)}&background=18181b&color=fff&size=80`;
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold theme-text truncate">{char.name}</h3>
                  <p className="text-xs theme-text-tertiary truncate mt-0.5">{char.personality.slice(0, 60)}</p>
                </div>
              </div>

              {/* Action buttons on hover */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNewChat(char.id);
                  }}
                  className="w-6 h-6 theme-bg-tertiary hover:theme-bg-secondary rounded-md flex items-center justify-center theme-text-secondary hover:theme-text transition-colors"
                  title="New chat"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(char);
                  }}
                  className="w-6 h-6 theme-bg-tertiary hover:theme-bg-secondary rounded-md flex items-center justify-center theme-text-secondary hover:theme-text transition-colors"
                  title="Edit character"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${char.name}"?`)) onDeleteCharacter(char.id);
                  }}
                  className="w-6 h-6 bg-red-950 hover:bg-red-900 rounded-md flex items-center justify-center text-red-500 hover:text-red-400 transition-colors"
                  title="Delete character"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create/Edit form */}
        {showCreateForm && (
          <div className="px-4 py-3 border-t theme-border overflow-y-auto shrink-0 max-h-[60%]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold theme-text-tertiary uppercase tracking-wider">
                {editingCharacter ? 'Edit Character' : 'New Character'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingCharacter(null);
                }}
                className="theme-text-tertiary hover:theme-text transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <CharacterForm
              onSave={handleSave}
              editingCharacter={editingCharacter}
              onCancel={() => {
                setShowCreateForm(false);
                setEditingCharacter(null);
              }}
              settings={settings}
            />
          </div>
        )}

        {/* Create button */}
        {!showCreateForm && (
          <div className="px-4 py-3 border-t theme-border shrink-0">
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full py-2.5 theme-accent-bg hover:opacity-90 theme-accent-text text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Character
            </button>
          </div>
        )}
      </aside>
    </>
  );
}