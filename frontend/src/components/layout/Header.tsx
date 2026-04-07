"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { ClusterBadge } from "@/components/layout/ClusterBadge";
import { useStats } from "@/lib/api/hooks";

const NAV_ITEMS = [
  { href: "/products", label: "Products" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/transparency", label: "Transparency" },
  { href: "/liquidity", label: "Liquidity" },
  { href: "/admin", label: "Issuer" },
];

function formatTvl(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: stats } = useStats();

  const tvlDisplay = stats ? formatTvl(stats.totalTvl) : "$—";

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
                <span className={`text-xs font-mono font-bold ${tvlValueColor}`}>{tvlDisplay}</span>
              </div>
            </div>

            {/* Desktop nav */}
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
                href="/admin/create"
                className="hidden sm:block px-4 py-2 text-xs font-extrabold uppercase tracking-widest bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                Get Access
              </Link>
              <ConnectButton />

              {/* Hamburger — mobile only */}
              <button
                className="md:hidden flex flex-col gap-1.5 p-1.5"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                <span className={`block w-5 h-0.5 transition-all ${isHome ? "bg-white" : "bg-[var(--color-text)]"} ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
                <span className={`block w-5 h-0.5 transition-all ${isHome ? "bg-white" : "bg-[var(--color-text)]"} ${mobileOpen ? "opacity-0" : ""}`} />
                <span className={`block w-5 h-0.5 transition-all ${isHome ? "bg-white" : "bg-[var(--color-text)]"} ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-bg)]">
            <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`px-3 py-2.5 text-sm font-bold uppercase tracking-wide rounded transition-colors ${
                      isActive
                        ? "bg-[var(--color-surface)] text-[var(--color-text)]"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/admin/create"
                onClick={() => setMobileOpen(false)}
                className="mt-2 px-3 py-2.5 text-sm font-extrabold uppercase tracking-widest text-white text-center"
                style={{ background: "var(--color-accent)" }}
              >
                Get Access
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
