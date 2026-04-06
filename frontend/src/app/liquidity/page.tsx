export default function LiquidityPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <p className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-[var(--color-text-muted)] mb-4">
        Liquidity
      </p>
      <h1 className="text-6xl font-extrabold uppercase tracking-tight text-black leading-none mb-6">
        On-chain Pools
      </h1>
      <p className="text-sm font-medium text-[var(--color-text-secondary)] max-w-xl leading-relaxed mb-8">
        ProofLayer-attested RWA tokens paired with USDC in Meteora CLMM pools.
        On-chain liquidity without fiat redemption.
      </p>
      <span className="inline-block text-xs font-extrabold uppercase tracking-widest border border-black text-black px-4 py-2">
        Coming Soon
      </span>
    </div>
  );
}
