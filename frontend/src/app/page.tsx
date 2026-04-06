import Link from "next/link";

const STATS = [
  { value: "$5.2M", label: "Total Assets Minted" },
  { value: "$180K", label: "Yield Paid Out" },
  { value: "3", label: "Registered Products" },
];

// SVG diamond decoration at various positions
function Diamond({
  size,
  x,
  y,
  opacity,
  rotate = 0,
}: {
  size: number;
  x: string;
  y: string;
  opacity: number;
  rotate?: number;
}) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: x, top: y, width: size, height: size, transform: `rotate(${rotate}deg)`, opacity }}
    >
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
        <path d="M50 5L95 50L50 95L5 50L50 5Z" fill="#177C41" fillOpacity="0.25" />
        <path d="M50 5L95 50L50 95L5 50L50 5Z" stroke="#2ECC71" strokeWidth="1.5" strokeOpacity="0.4" />
        <path d="M50 20L80 50L50 80L20 50L50 20Z" fill="none" stroke="#2ECC71" strokeWidth="1" strokeOpacity="0.25" />
        <path d="M50 35L65 50L50 65L35 50L50 35Z" fill="#177C41" fillOpacity="0.35" />
      </svg>
    </div>
  );
}

export default function Home() {
  return (
    <div
      className="relative overflow-hidden min-h-screen"
      style={{ background: "var(--color-dark)" }}
    >
      {/* Radial glow behind the text */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(23,124,65,0.18) 0%, transparent 70%)",
        }}
      />

      {/* Decorative diamonds */}
      <Diamond size={90}  x="3%"   y="18%"  opacity={0.5}  rotate={0}   />
      <Diamond size={55}  x="9%"   y="52%"  opacity={0.35} rotate={12}  />
      <Diamond size={120} x="0%"   y="62%"  opacity={0.25} rotate={-8}  />
      <Diamond size={70}  x="16%"  y="72%"  opacity={0.4}  rotate={5}   />

      <Diamond size={100} x="83%"  y="15%"  opacity={0.5}  rotate={0}   />
      <Diamond size={130} x="88%"  y="42%"  opacity={0.3}  rotate={10}  />
      <Diamond size={65}  x="76%"  y="65%"  opacity={0.4}  rotate={-5}  />
      <Diamond size={50}  x="90%"  y="72%"  opacity={0.35} rotate={15}  />

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-112px)] px-4 text-center">
        <div className="max-w-4xl mx-auto">

          {/* Eyebrow */}
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-[var(--color-accent-bright)] mb-8 opacity-80">
            RWA Infrastructure · Solana
          </p>

          {/* Headline — serif like Midas */}
          <h1
            className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.08] mb-7"
            style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}
          >
            The Standard for<br />
            Onchain RWA Tokens
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg font-medium text-white/55 max-w-xl mx-auto mb-10 leading-relaxed tracking-wide">
            Full Transparency. Instant Redemptions. Native Composability.
          </p>

          {/* CTA */}
          <Link
            href="/products"
            className="inline-block px-8 py-4 text-sm font-extrabold uppercase tracking-widest text-white transition-all"
            style={{ background: "var(--color-accent)" }}
          >
            Explore Products
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-20 flex flex-col sm:flex-row items-center justify-center gap-0 border border-[var(--color-dark-border)] divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-dark-border)]">
          {STATS.map((stat) => (
            <div key={stat.label} className="px-12 py-6 text-center">
              <p className="text-3xl sm:text-4xl font-mono font-bold text-white mb-1 tabular-nums">
                {stat.value}
              </p>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
