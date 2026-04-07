"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useAttestations, useAssets } from "@/lib/solana/hooks";
import { useProducts } from "@/lib/api/hooks";
import { shortenAddress } from "@/lib/solana/format";
import { StatusBadge } from "@/components/policy/StatusBadge";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-[var(--color-border)] bg-white px-5 py-5">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--color-text-muted)] mb-2">
        {label}
      </p>
      <p className="text-4xl font-extrabold uppercase tracking-tight text-black leading-none">
        {value}
      </p>
      {sub && <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mt-2">{sub}</p>}
    </div>
  );
}

export default function AdminOverview() {
  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: attestations } = useAttestations();
  const { data: onChainAssets } = useAssets();
  const [now] = useState(() => Math.floor(Date.now() / 1000));

  // Bridge: mintPubkey → on-chain asset PDA
  const mintToAssetPda = new Map<string, string>();
  for (const a of onChainAssets ?? []) {
    mintToAssetPda.set(a.mint, a.pubkey);
  }

  if (loadingProducts) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
          Loading…
        </p>
      </div>
    );
  }

  const list = products ?? [];

  const latestAttestationByAsset = new Map<
    string,
    { navBps: number; yieldBps: number; fresh: boolean; publishedAt?: number }
  >();
  for (const att of attestations ?? []) {
    const existing = latestAttestationByAsset.get(att.assetPubkey);
    if (!existing || att.publishedAt > (existing.publishedAt ?? 0)) {
      latestAttestationByAsset.set(att.assetPubkey, {
        navBps: att.navBps,
        yieldBps: att.yieldRateBps,
        fresh: att.validUntil > now,
        publishedAt: att.publishedAt,
      });
    }
  }

  const avgYield =
    latestAttestationByAsset.size > 0
      ? (
          [...latestAttestationByAsset.values()].reduce((s, a) => s + a.yieldBps, 0) /
          latestAttestationByAsset.size /
          100
        ).toFixed(2) + "%"
      : "—";

  const freshCount = [...latestAttestationByAsset.values()].filter((a) => a.fresh).length;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--color-text-muted)] mb-2">
            Issuer Dashboard
          </p>
          <h1 className="text-5xl font-extrabold uppercase tracking-tight text-black leading-none">
            Overview
          </h1>
        </div>
        <Link
          href="/admin/create"
          className="px-4 py-2.5 text-xs font-extrabold uppercase tracking-widest bg-black text-white hover:bg-[var(--color-text-secondary)] transition-colors"
        >
          + Create Asset
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard label="Assets" value={String(list.length)} />
        <StatCard label="Attestations" value={String(attestations?.length ?? 0)} />
        <StatCard label="Avg. Yield" value={avgYield} />
        <StatCard label="Fresh" value={String(freshCount)} sub="Attestations" />
      </div>

      {/* Assets table */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--color-text-muted)] mb-3">
          Your Assets
        </p>
        <div className="border border-[var(--color-border)] bg-white overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_0.8fr] gap-4 px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            {["Asset", "Type", "NAV", "Yield", "Status"].map((col, i) => (
              <span
                key={col}
                className={`text-sm font-bold uppercase tracking-widest text-[var(--color-text-secondary)] ${
                  i === 0 ? "" : i === 4 ? "text-center" : "text-right"
                }`}
              >
                {col}
              </span>
            ))}
          </div>

          {list.length === 0 ? (
            <p className="px-6 py-12 text-center text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
              No assets registered yet
            </p>
          ) : (
            list.map((product) => {
              const assetPda = mintToAssetPda.get(product.mintPubkey ?? product.id);
              const att = assetPda ? latestAttestationByAsset.get(assetPda) : undefined;
              return (
                <Link
                  key={product.id}
                  href={`/admin/assets/${product.id}`}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_0.8fr] gap-4 px-6 py-4 items-center hover:bg-[var(--color-surface)] transition-colors border-b border-[var(--color-border-subtle)] last:border-b-0"
                >
                  <div>
                    <p className="text-base font-bold uppercase tracking-wide text-black">
                      {product.name}
                    </p>
                    <p className="text-xs font-mono text-[var(--color-text-muted)] mt-0.5">
                      {shortenAddress(product.mintPubkey ?? product.id, 6)}
                    </p>
                  </div>
                  <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-text-secondary)] text-right">
                    {product.assetType}
                  </p>
                  <p className="text-base font-mono font-semibold text-black text-right tabular-nums">
                    {att ? (att.navBps / 10000).toFixed(4) : `$${product.price.toFixed(4)}`}
                  </p>
                  <p className="text-sm font-mono font-bold text-black text-right tabular-nums">
                    {att ? `${(att.yieldBps / 100).toFixed(2)}%` : (product.apy ?? 0) > 0 ? `${(product.apy ?? 0).toFixed(2)}%` : "—"}
                  </p>
                  <div className="flex justify-center">
                    <StatusBadge status={product.status} />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
