"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { useSelectedWalletAccount } from "@solana/react";
import { usePortfolio, useKycStatus, useActivity } from "@/lib/api/hooks";
import { shortenAddress } from "@/lib/solana/format";

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function KycBadge() {
  const { data: kyc } = useKycStatus();
  if (!kyc) return null;

  const variants: Record<string, { label: string; cls: string; link: boolean }> = {
    approved: { label: `KYC Approved · ${kyc.tier ?? ""}`, cls: "border-green-500 text-green-700 bg-green-50", link: false },
    pending:  { label: "KYC In Progress", cls: "border-amber-400 text-amber-700 bg-amber-50", link: true },
    rejected: { label: "KYC Rejected — Resubmit", cls: "border-red-400 text-red-700 bg-red-50", link: true },
    expired:  { label: "KYC Expired — Renew", cls: "border-gray-400 text-gray-600 bg-gray-50", link: true },
    not_started: { label: "KYC Required — Start here →", cls: "border-[var(--color-accent)] text-[var(--color-accent)] bg-white hover:bg-[var(--color-surface)] transition-colors", link: true },
  };
  const v = variants[kyc.status] ?? variants.not_started;
  const inner = (
    <>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {v.label}
    </>
  );

  if (v.link) {
    return (
      <Link href="/kyc" className={`inline-flex items-center gap-1.5 border px-3 py-1 text-xs font-bold uppercase tracking-widest ${v.cls}`}>
        {inner}
      </Link>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 border px-3 py-1 text-xs font-bold uppercase tracking-widest ${v.cls}`}>
      {inner}
    </span>
  );
}

export default function PortfolioPage() {
  const [account] = useSelectedWalletAccount();
  const { data: portfolio, isLoading } = usePortfolio();
  const { data: activityData } = useActivity(10);

  if (!account) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-text-muted)] mb-4">Portfolio</p>
        <h1 className="text-4xl font-extrabold uppercase tracking-tight text-[var(--color-text)] mb-4">Connect Wallet</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Connect your wallet to view your RWA holdings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-text-muted)] mb-1">Portfolio</p>
          <p className="text-xs font-mono text-[var(--color-text-muted)]">{account.address}</p>
        </div>
        <KycBadge />
      </div>

      {/* Total value */}
      <div className="border border-[var(--color-border)] bg-white px-8 py-7 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--color-text-muted)] mb-2">Total Portfolio Value</p>
          <p className="text-5xl font-extrabold tracking-tight text-[var(--color-text)]">
            {isLoading ? "—" : formatUsd(portfolio?.totalUsdValue ?? 0)}
          </p>
        </div>
        <Link
          href="/products"
          className="px-5 py-3 text-xs font-extrabold uppercase tracking-widest text-white transition-colors"
          style={{ background: "var(--color-accent)" }}
        >
          Browse Products
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

        {/* Holdings */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--color-text-muted)] mb-4">Holdings</p>
          {isLoading ? (
            <p className="text-xs font-mono tracking-widest text-[var(--color-text-muted)] py-10">Loading…</p>
          ) : !portfolio?.holdings.length ? (
            <div className="border border-[var(--color-border)] bg-white px-8 py-12 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">No holdings yet</p>
              <p className="text-sm text-[var(--color-text-secondary)] mb-5">
                You don't hold any ProofLayer RWA tokens yet.
              </p>
              <Link
                href="/products"
                className="inline-block px-5 py-2.5 text-xs font-extrabold uppercase tracking-widest text-white"
                style={{ background: "var(--color-dark)" }}
              >
                Explore Products
              </Link>
            </div>
          ) : (
            <div className="border border-[var(--color-border)] bg-white divide-y divide-[var(--color-border)]">
              {/* Table head */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3">
                {["Asset", "Balance", "NAV Price", "Value"].map((h) => (
                  <span key={h} className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{h}</span>
                ))}
              </div>
              {portfolio.holdings.map((h) => (
                <Link
                  key={h.assetId}
                  href={`/products/${h.assetId}`}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-4 hover:bg-[var(--color-surface)] transition-colors items-center"
                >
                  <div className="flex items-center gap-3">
                    {h.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={h.imageUrl} alt={h.name} className="w-8 h-8 rounded-full object-contain border border-[var(--color-border)] bg-white" />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: "var(--color-accent)" }}>
                        {h.ticker.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-text)]">{h.ticker}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{h.assetType}</p>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-semibold text-right">{h.balanceFormatted.toFixed(4)}</span>
                  <span className="text-sm font-mono text-right">{formatUsd(h.navPrice)}</span>
                  <span className="text-sm font-bold font-mono text-right" style={{ color: "var(--color-accent)" }}>
                    {formatUsd(h.usdValue)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--color-text-muted)] mb-4">Recent Activity</p>
          <div className="border border-[var(--color-border)] bg-white divide-y divide-[var(--color-border-subtle)]">
            {!activityData?.activity.length ? (
              <div className="px-5 py-8 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">No activity yet</p>
              </div>
            ) : (
              activityData.activity.map((entry) => (
                <div key={entry.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)]">
                        {entry.action.replace(/\./g, " · ")}
                      </p>
                      {entry.target && (
                        <p className="text-[0.65rem] font-mono text-[var(--color-text-muted)] mt-0.5">
                          {entry.target.length > 20 ? shortenAddress(entry.target, 4) : entry.target}
                        </p>
                      )}
                    </div>
                    <span className="text-[0.65rem] text-[var(--color-text-muted)] shrink-0 whitespace-nowrap">
                      {formatDate(entry.timestamp)}
                    </span>
                  </div>
                  {entry.txSignature && (
                    <p className="text-[0.65rem] font-mono text-[var(--color-text-muted)] mt-1 truncate">
                      tx: {entry.txSignature.slice(0, 16)}…
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
