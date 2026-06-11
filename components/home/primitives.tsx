'use client';

import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

export function ModeTile({
  icon,
  title,
  body,
  onClick
}: {
  icon: ReactNode;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button className="mode-tile" onClick={onClick}>
      <span className="tile-icon">{icon}</span>
      <strong>{title}</strong>
      <small>{body}</small>
    </button>
  );
}

export function RuleLine({ active, icon, label }: { active: boolean; icon: ReactNode; label: string }) {
  return (
    <div className={`rule-line ${active ? 'active' : ''}`}>
      {active ? <Check size={18} /> : icon}
      <span>{label}</span>
    </div>
  );
}

export function MetaPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="meta-pill">
      {icon}
      {label}
    </span>
  );
}
