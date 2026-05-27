import { useState } from 'react';
import type { Character, AppSettings } from '../types';
import { AVAILABLE_MODELS } from '../types';
import { CharacterForm } from './CharacterForm';

interface SidebarProps {
  characters: Character[];
  activeCharacterId: string | null;
  settings: AppSettings;
  onSelectCharacter: (id: string) => void;
  onDeleteCharacter: (id: string) => void;
  onSaveCharacter: (character: Character) => void;
  onUpdateSettings: (settings: AppSettings) => void;
  onNewChat: (characterId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  characters,
  activeCharacterId,
  settings,
  onSelectCharacter,
  onDeleteCharacter,
  onSaveCharacter,
  onUpdateSettings,
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
      {/* Toggle button when collapsed */}
      {isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="fixed top-4 left-4 z-50 w-10 h-10 bg-black border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all shadow-lg"
          title="Open sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`h-full bg-black border-r border-zinc-800 flex flex-col transition-all duration-300 overflow-hidden ${
          isCollapsed ? 'w-0 border-r-0' : 'w-80'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800 shrink-0 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
              AI
            </div>
            <h1 className="text-sm font-bold text-white truncate">Character Chat</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                showSettings ? 'bg-zinc-800 text-zinc-300' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
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
              className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
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
          <div className="px-4 py-3 border-b border-zinc-800 space-y-3 shrink-0">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">
                OpenRouter API Key
              </label>
              <input
                type="password"
                value={settings.openRouterApiKey}
                onChange={(e) => onUpdateSettings({ ...settings, openRouterApiKey: e.target.value })}
                placeholder="sk-or-v1-..."
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">
                Model
              </label>
              <select
                value={settings.selectedModel}
                onChange={(e) => onUpdateSettings({ ...settings, selectedModel: e.target.value })}
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-500 transition-all"
              >
                {AVAILABLE_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Character list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {characters.length === 0 && !showCreateForm && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🤖</div>
              <p className="text-zinc-500 text-sm">No characters yet</p>
              <p className="text-zinc-700 text-xs mt-1">Create your first character to begin</p>
            </div>
          )}

          {characters.map((char) => (
            <div
              key={char.id}
              className={`group relative rounded-xl p-3 cursor-pointer transition-all duration-200 ${
                activeCharacterId === char.id
                  ? 'bg-zinc-900 border border-zinc-700'
                  : 'bg-black border border-zinc-800 hover:bg-zinc-900'
              }`}
              onClick={() => onSelectCharacter(char.id)}
            >
              <div className="flex items-center gap-3">
                <img
                  src={char.avatarUrl}
                  alt={char.name}
                  className="w-10 h-10 rounded-full object-cover border border-zinc-700 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(char.name)}&background=18181b&color=fff&size=80`;
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-zinc-100 truncate">{char.name}</h3>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">{char.personality.slice(0, 60)}</p>
                </div>
              </div>

              {/* Action buttons on hover */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNewChat(char.id);
                  }}
                  className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 rounded-md flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
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
                  className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 rounded-md flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
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
          <div className="px-4 py-3 border-t border-zinc-800 overflow-y-auto shrink-0 max-h-[60%]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                {editingCharacter ? 'Edit Character' : 'New Character'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingCharacter(null);
                }}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
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
          <div className="px-4 py-3 border-t border-zinc-800 shrink-0">
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full py-2.5 bg-white hover:bg-zinc-200 text-black text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
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