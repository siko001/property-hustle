'use client';

import { Bot, Shield, Timer, Users, Volume2, Zap } from 'lucide-react';
import { RoomComposer } from '@/components/home/RoomComposer';
import { RuleLine } from '@/components/home/primitives';
import { playStyleLabels } from '@/lib/game/rules';
import type { Difficulty, RoomRules } from '@/lib/game/types';

export function SettingsScreen({
  players,
  bots,
  difficulty,
  rules,
  editingRoom,
  onPlayers,
  onBots,
  onDifficulty,
  onRules,
  onCreate,
  onClose
}: {
  players: number;
  bots: number;
  difficulty: Difficulty;
  rules: RoomRules;
  editingRoom: boolean;
  onPlayers: (value: number) => void;
  onBots: (value: number) => void;
  onDifficulty: (value: Difficulty) => void;
  onRules: (value: RoomRules) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  return (
    <section className="two-column">
      <RoomComposer
        players={players}
        bots={bots}
        difficulty={difficulty}
        rules={rules}
        onPlayers={onPlayers}
        onBots={onBots}
        onDifficulty={onDifficulty}
        onRules={onRules}
        onCreate={onCreate}
        onClose={onClose}
        editingRoom={editingRoom}
        expanded
      />

      <div className="surface rule-preview">
        <div className="section-kicker">Room profile</div>
        <h2>{playStyleLabels[rules.playStyle]} table</h2>
        <div className="rule-list">
          <RuleLine active icon={<Users size={18} />} label={`${players} seats`} />
          <RuleLine active={bots > 0} icon={<Bot size={18} />} label={`${bots} bot seats`} />
          <RuleLine active={rules.allowTeamDefense} icon={<Shield size={18} />} label="Team defense" />
          <RuleLine active={rules.chainBlocks} icon={<Zap size={18} />} label="Chain blocks" />
          <RuleLine active={rules.autoSkip} icon={<Timer size={18} />} label="Auto skip" />
          <RuleLine active icon={<Volume2 size={18} />} label={`${rules.reminderEverySeconds}s reminder`} />
        </div>
      </div>
    </section>
  );
}
