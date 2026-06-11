'use client';

import type { ReactNode } from 'react';
import { Minus, Plus, QrCode, Settings2, X } from 'lucide-react';
import { MAX_BOTS, MAX_PLAYERS, MIN_PLAYERS } from '@/lib/game/constants';
import { playStyleCopy, playStyleLabels } from '@/lib/game/rules';
import type { Difficulty, PlayStyle, RoomRules } from '@/lib/game/types';

export function RoomComposer({
  players,
  bots,
  difficulty,
  rules,
  onPlayers,
  onBots,
  onDifficulty,
  onRules,
  onCreate,
  onClose,
  editingRoom,
  expanded = false
}: {
  players: number;
  bots: number;
  difficulty: Difficulty;
  rules: RoomRules;
  onPlayers: (value: number) => void;
  onBots: (value: number) => void;
  onDifficulty: (value: Difficulty) => void;
  onRules: (value: RoomRules) => void;
  onCreate: () => void;
  onClose: () => void;
  editingRoom: boolean;
  expanded?: boolean;
}) {
  return (
    <div className="surface composer">
      <div className="section-kicker">Room settings</div>
      <h2>{editingRoom ? 'Update this room' : 'Build a table'}</h2>

      <div className="settings-stack">
        <SettingRow label="Players" hint="2 min, 5 max">
          <Stepper value={players} min={MIN_PLAYERS} max={MAX_PLAYERS} onChange={onPlayers} />
        </SettingRow>

        <SettingRow label="Bots" hint="4 max">
          <Stepper value={bots} min={0} max={Math.min(MAX_BOTS, players - 1)} onChange={onBots} />
        </SettingRow>

        {bots > 0 && (
          <SettingRow label="Bot difficulty" hint="Applies to bot seats">
            <select value={difficulty} onChange={(event) => onDifficulty(event.target.value as Difficulty)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </SettingRow>
        )}

        <SettingRow label="Play style" hint={playStyleCopy[rules.playStyle]}>
          <div className="segmented">
            {(Object.keys(playStyleLabels) as PlayStyle[]).map((style) => (
              <button
                className={rules.playStyle === style ? 'active' : ''}
                key={style}
                onClick={() => onRules({ ...rules, playStyle: style })}
              >
                {playStyleLabels[style]}
              </button>
            ))}
          </div>
        </SettingRow>

        <ToggleRow
          label="Team defense"
          hint="Other players may spend a block card for someone else."
          checked={rules.allowTeamDefense}
          onChange={() => onRules({ ...rules, allowTeamDefense: !rules.allowTeamDefense })}
        />

        <ToggleRow
          label="Chain blocks"
          hint="Block cards can answer other block cards."
          checked={rules.chainBlocks}
          onChange={() => onRules({ ...rules, chainBlocks: !rules.chainBlocks })}
        />

        {expanded && (
          <>
            <ToggleRow
              label="Actions as money"
              hint="Action cards may be banked for value."
              checked={rules.actionCardsAsMoney}
              onChange={() => onRules({ ...rules, actionCardsAsMoney: !rules.actionCardsAsMoney })}
            />
            <ToggleRow
              label="Rent multiplier"
              hint="Multiplier actions may stack with rent."
              checked={rules.rentMultiplier}
              onChange={() => onRules({ ...rules, rentMultiplier: !rules.rentMultiplier })}
            />
            <ToggleRow
              label="Move wildcards"
              hint="Wild property cards can move between districts."
              checked={rules.wildCardsMoveFreely}
              onChange={() => onRules({ ...rules, wildCardsMoveFreely: !rules.wildCardsMoveFreely })}
            />
            <SettingRow label="Turn seconds" hint="Room timer">
              <Stepper value={rules.turnSeconds} min={30} max={180} step={15} onChange={(value) => onRules({ ...rules, turnSeconds: value })} />
            </SettingRow>
            <SettingRow label="Reminder sound" hint="Sweet-turn nudge">
              <Stepper value={rules.reminderEverySeconds} min={10} max={60} step={5} onChange={(value) => onRules({ ...rules, reminderEverySeconds: value })} />
            </SettingRow>
            <ToggleRow
              label="Auto skip"
              hint="Skip when the timer expires."
              checked={rules.autoSkip}
              onChange={() => onRules({ ...rules, autoSkip: !rules.autoSkip })}
            />
          </>
        )}
      </div>

      <div className="composer-actions">
        <button className="primary-button" onClick={onCreate}>
          {editingRoom ? <Settings2 size={18} /> : <QrCode size={18} />}
          {editingRoom ? 'Update settings' : 'Create room'}
        </button>
        {editingRoom && (
          <button className="ghost-button" onClick={onClose}>
            <X size={18} />
            Close
          </button>
        )}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  hint,
  children
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="setting-row">
      <span>
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button className="setting-row toggle-row" onClick={onChange}>
      <span>
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <span className={`toggle ${checked ? 'on' : ''}`}>
        <span />
      </span>
    </button>
  );
}

function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - step))} aria-label="Decrease">
        <Minus size={16} />
      </button>
      <strong>{value}</strong>
      <button type="button" onClick={() => onChange(Math.min(max, value + step))} aria-label="Increase">
        <Plus size={16} />
      </button>
    </div>
  );
}
