'use client';

import { BookOpen, Gamepad2, Home, Layers, Settings2 } from 'lucide-react';
import type { Screen } from './types';

export function TopBar({
  code,
  screen,
  settingsAvailable,
  onHome,
  onRules,
  onCards,
  onSettings
}: {
  code: string;
  screen: Screen;
  settingsAvailable: boolean;
  onHome: () => void;
  onRules: () => void;
  onCards: () => void;
  onSettings: () => void;
}) {
  return (
    <header className="topbar">
      <button className="brand-button" onClick={onHome}>
        <Gamepad2 size={22} />
        <span>Property Hustle</span>
      </button>
      <nav className="top-actions">
        {(screen === 'lobby' || screen === 'game') && <span className="code-chip">{code}</span>}
        {(screen === 'lobby' || screen === 'game') && (
          <button className="icon-button" onClick={onRules} aria-label="Game rules" title="Game rules">
            <BookOpen size={19} />
          </button>
        )}
        {(screen === 'lobby' || screen === 'game') && (
          <button className="icon-button" onClick={onCards} aria-label="Card list" title="Card list">
            <Layers size={19} />
          </button>
        )}
        {screen !== 'dashboard' && (
          <button className="icon-button" onClick={onHome} aria-label="Home">
            <Home size={19} />
          </button>
        )}
        {settingsAvailable && (
          <button className="icon-button" onClick={onSettings} aria-label="Room settings">
            <Settings2 size={19} />
          </button>
        )}
      </nav>
    </header>
  );
}
