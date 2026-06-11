'use client';

import { ChevronRight, KeyRound, Radio, Smartphone, WifiOff } from 'lucide-react';

export function OfflineScreen({
  localPlayerName,
  localJoinKey,
  onLocalPlayerNameChange,
  onLocalJoinKeyChange,
  onCreateLocalTable,
  onJoinLocalTable
}: {
  localPlayerName: string;
  localJoinKey: string;
  onLocalPlayerNameChange: (value: string) => void;
  onLocalJoinKeyChange: (value: string) => void;
  onCreateLocalTable: () => void;
  onJoinLocalTable: () => void;
}) {
  return (
    <section className="offline-layout">
      <div className="surface offline-host">
        <div className="section-kicker">Offline nearby</div>
        <h2>Host from one device</h2>
        <p className="lead compact">
          Create a local table token, connect everyone to the same hotspot, then join with the
          QR or secret key.
        </p>

        <div className="lan-grid">
          <div className="lan-step">
            <Smartphone size={22} />
            <span>Host device</span>
          </div>
          <div className="lan-step">
            <Radio size={22} />
            <span>Hotspot</span>
          </div>
          <div className="lan-step">
            <KeyRound size={22} />
            <span>Secret key</span>
          </div>
        </div>

        <button className="primary-button wide" onClick={onCreateLocalTable}>
          <WifiOff size={18} />
          Create local table
        </button>
      </div>

      <div className="surface join-panel">
        <div className="section-kicker">Join local table</div>
        <label className="text-field">
          <span>Player name</span>
          <input
            value={localPlayerName}
            onChange={(event) => onLocalPlayerNameChange(event.target.value)}
            placeholder="Type your player name"
          />
        </label>
        <label className="text-field">
          <span>Secret key</span>
          <input
            value={localJoinKey}
            onChange={(event) => onLocalJoinKeyChange(event.target.value.toUpperCase())}
            placeholder="ABCD-1234-WXYZ or PH-LAN invite"
          />
        </label>
        <button className="ghost-button wide" onClick={onJoinLocalTable}>
          <ChevronRight size={18} />
          Join with key
        </button>
      </div>
    </section>
  );
}
