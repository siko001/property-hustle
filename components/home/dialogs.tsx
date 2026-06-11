'use client';

import { RotateCcw, X } from 'lucide-react';

export function ConfirmDiscardSettings({
  onCancel,
  onConfirm
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-label="Discard room settings">
      <div className="confirm-sheet">
        <div className="section-kicker">Unsaved settings</div>
        <h2>Discard changes?</h2>
        <p>
          You changed this room&apos;s settings but have not updated the room yet. Closing now will
          lose those edits.
        </p>
        <div className="confirm-actions">
          <button className="ghost-button" onClick={onCancel}>
            Keep editing
          </button>
          <button className="danger-button" onClick={onConfirm}>
            <X size={18} />
            Discard changes
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmEndTurn({
  remainingPlays,
  onCancel,
  onConfirm
}: {
  remainingPlays: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true" aria-label="End turn confirmation">
      <div className="confirm-sheet">
        <div className="section-kicker">End turn</div>
        <h2>Pass with plays left?</h2>
        <p>
          You still have {remainingPlays} play{remainingPlays === 1 ? '' : 's'} available this turn.
        </p>
        <div className="confirm-actions">
          <button className="ghost-button" onClick={onCancel}>
            Keep playing
          </button>
          <button className="primary-button" onClick={onConfirm}>
            <RotateCcw size={18} />
            End turn
          </button>
        </div>
      </div>
    </div>
  );
}
