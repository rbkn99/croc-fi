"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { ClusterBadge } from "@/components/layout/ClusterBadge";

const NAV_ITEMS = [
  { href: "/products", label: "Products" },
  { href: "/transparency", label: "Transparency" },
  { href: "/liquidity", label: "Liquidity" },
  { href: "/admin", label: "Issuer" },
];

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const headerBg = isHome
    ? "bg-[var(--color-dark)] border-[var(--color-dark-border)]"
    : "bg-[var(--color-bg)] border-[var(--color-border)]";

  const logoColor = isHome ? "text-white" : "text-[var(--color-text)]";
  const tvlColor = isHome ? "text-white/50" : "text-[var(--color-text-muted)]";
  const tvlValueColor = isHome ? "text-white/80" : "text-[var(--color-text-secondary)]";

  const navColor = (active: boolean) =>
    isHome
      ? active
        ? "text-white border-b border-white/60 pb-0.5"
        : "text-white/55 hover:text-white/90"
      : active
        ? "text-[var(--color-text)]"
        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]";

  const connectVariant = isHome ? "dark" : "light";

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-[var(--color-dark)] text-white/70 text-xs font-bold uppercase tracking-[0.2em] py-2.5 text-center border-b border-[var(--color-dark-border)]">
        <span>ProofLayer attestation consensus is live on Solana devnet</span>
        <span className="mx-3 opacity-30">·</span>
        <Link href="/transparency" className="text-[var(--color-accent-bright)] hover:text-white transition-colors">
          View transparency ↗
        </Link>
      </div>

      {/* Main header */}
      <header className={`sticky top-0 z-50 border-b transition-colors ${headerBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Logo + TVL */}
            <div className="flex items-center gap-5">
              <Link href="/" className="flex items-center gap-2">
                {/* Diamond logo mark */}
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
                  <path d="M10 1L19 10L10 19L1 10L10 1Z" fill="var(--color-accent)" opacity="0.9"/>
                  <path d="M10 4L16 10L10 16L4 10L10 4Z" fill="none" stroke="var(--color-accent-bright)" strokeWidth="0.8" opacity="0.6"/>
                </svg>
                <span className={`text-xl font-extrabold uppercase tracking-wide ${logoColor}`}>
                  ProofLayer
                </span>
              </Link>
              <div className="hidden sm:flex items-center gap-1.5">
                <span className={`text-xs font-bold uppercase tracking-widest ${tvlColor}`}>TVL</span>
                <span className={`text-xs font-mono font-bold ${tvlValueColor}`}>$5.2M</span>
              </div>
            </div>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-7">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-bold uppercase tracking-wide transition-colors ${navColor(isActive)}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right */}
            <div className="flex items-center gap-3">
              <ClusterBadge />
              <Link
                href="/apply"
                className={`hidden sm:block px-4 py-2 text-xs font-extrabold uppercase tracking-widest transition-colors ${
                  isHome
                    ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
                    : "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
                }`}
              >
                Get Access
              </Link>
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
