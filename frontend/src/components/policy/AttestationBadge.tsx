"use client";

import { useState } from "react";

interface AttestationBadgeProps {
  isFresh: boolean;
  validUntil: number;
}

export function AttestationBadge({ isFresh, validUntil }: AttestationBadgeProps) {
  const [now] = useState(() => Math.floor(Date.now() / 1000));
  const remaining = validUntil - now;
  const hours = Math.max(0, Math.floor(remaining / 3600));
  const minutes = Math.max(0, Math.floor((remaining % 3600) / 60));

  if (!isFresh) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-widest border border-[var(--color-danger)] text-[var(--color-danger)]">
        Stale
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-widest border border-[var(--color-success)] text-[var(--color-success)]">
      <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
      Live · {hours}h {minutes}m
    </span>
  );
}
