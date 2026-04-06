import Link from "next/link";

export function Footer() {
  return (
    <footer
      className="border-t mt-auto"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Diamond mark */}
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M10 1L19 10L10 19L1 10L10 1Z" fill="var(--color-accent)" opacity="0.85"/>
            </svg>
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
              ProofLayer · RWA Infrastructure for Solana
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="/transparency"
              className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              Transparency
            </Link>
            <Link
              href="https://github.com/rbkn99/CrocFi"
              target="_blank"
              className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              Community & Support ↗
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
