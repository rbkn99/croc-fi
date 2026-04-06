interface StatusBadgeProps {
  status: string;
}

const STYLES: Record<string, string> = {
  active:   "border-black text-black",
  paused:   "border-[var(--color-text-secondary)] text-[var(--color-text-secondary)]",
  redeemed: "border-[var(--color-text-muted)] text-[var(--color-text-muted)]",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-widest border ${
        STYLES[status] ?? STYLES.redeemed
      }`}
    >
      {status}
    </span>
  );
}
