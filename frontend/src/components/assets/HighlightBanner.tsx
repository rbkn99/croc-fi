export function HighlightBanner() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--color-text-muted)] mb-4">
        Highlights
      </p>

      {/* Card */}
      <div
        className="relative overflow-hidden border border-[var(--color-border)] p-8 flex flex-col lg:flex-row items-start lg:items-center gap-6"
        style={{
          background:
            "linear-gradient(135deg, rgba(23,124,65,0.12) 0%, rgba(46,204,113,0.06) 50%, rgba(23,124,65,0.04) 100%)",
          borderColor: "rgba(23,124,65,0.3)",
        }}
      >
        {/* Decorative radial glow */}
        <div
          className="absolute left-0 top-0 w-64 h-64 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 20% 40%, rgba(46,204,113,0.15) 0%, transparent 60%)",
          }}
        />

        {/* Token icon */}
        <div className="relative shrink-0 w-20 h-20 flex items-center justify-center">
          {/* Ripple rings */}
          <div
            className="absolute w-20 h-20 rounded-full border"
            style={{ borderColor: "rgba(46,204,113,0.2)" }}
          />
          <div
            className="absolute w-14 h-14 rounded-full border"
            style={{ borderColor: "rgba(46,204,113,0.3)" }}
          />
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm"
            style={{ background: "var(--color-accent)" }}
          >
            TB
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="inline-block text-[0.65rem] font-bold uppercase tracking-widest border px-2.5 py-1 mb-3"
            style={{ borderColor: "rgba(23,124,65,0.4)", color: "var(--color-accent-bright)" }}>
            New Product
          </div>
          <h3 className="text-2xl font-bold uppercase tracking-tight text-[var(--color-text)] mb-2">
            Introducing mTBILL-SOL
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-md leading-relaxed">
            Tokenized US Treasuries with native yield accrual, on-chain compliance enforcement,
            and DeFi composability — powered by ProofLayer.
          </p>
        </div>

        {/* Built-with badges */}
        <div className="shrink-0 text-right">
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
            Built with
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest border border-[var(--color-border)] text-[var(--color-text-secondary)] px-3 py-1.5">
              Token-2022
            </span>
            <span
              className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 text-white"
              style={{ background: "var(--color-accent)" }}
            >
              ProofLayer
            </span>
          </div>
        </div>
      </div>

      {/* Pagination dots */}
      <div className="flex justify-center gap-2 mt-3">
        <span className="w-5 h-1.5 rounded-full" style={{ background: "var(--color-accent)" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-border)]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-border)]" />
      </div>
    </div>
  );
}
