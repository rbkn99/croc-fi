"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useAssets, useAttestations } from "@/lib/solana/hooks";
import { formatPercent, shortenAddress } from "@/lib/solana/format";

export default function AttestationsPage() {
  const { data: attestations, isLoading } = useAttestations();
  const { data: assets } = useAssets();
  const [filterAsset, setFilterAsset] = useState("all");
  const [now] = useState(() => Math.floor(Date.now() / 1000));

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-[var(--color-text-muted)]">Loading attestations...</p>
      </div>
    );
  }

  const filtered = (attestations ?? []).filter((att) => {
    return filterAsset === "all" || att.assetPubkey === filterAsset;
  });

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Attestation Records</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          On-chain attestation records. {attestations?.length ?? 0} total.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={filterAsset}
          onChange={(e) => setFilterAsset(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
        >
          <option value="all">All Assets</option>
          {(assets ?? []).map((a) => (
            <option key={a.pubkey} value={a.pubkey}>{shortenAddress(a.mint, 6)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="grid grid-cols-[1.5fr_0.8fr_0.8fr_1.5fr_1.2fr_0.7fr] gap-3 px-6 py-2.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase bg-[var(--color-surface-secondary)] border-b border-[var(--color-border)]">
          <span>Asset</span>
          <span className="text-right">NAV</span>
          <span className="text-right">Yield</span>
          <span>Proof Hash</span>
          <span>Published</span>
          <span className="text-center">Status</span>
        </div>
        {filtered.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-[var(--color-text-muted)]">No attestations found</p>
        ) : (
          filtered.map((att) => {
            const isFresh = att.validUntil > now;
            return (
              <div
                key={att.pubkey}
                className="grid grid-cols-[1.5fr_0.8fr_0.8fr_1.5fr_1.2fr_0.7fr] gap-3 px-6 py-3.5 items-center border-b border-[var(--color-border)] last:border-b-0"
              >
                <span className="text-sm font-mono text-[var(--color-text)]">{shortenAddress(att.assetPubkey, 6)}</span>
                <span className="text-sm font-mono text-right">{(att.navBps / 10000).toFixed(4)}</span>
                <span className="text-sm font-mono text-right">{formatPercent(att.yieldRateBps / 100)}</span>
                <span className="text-xs font-mono text-[var(--color-text-muted)] truncate" title={att.proofHash}>
                  {att.proofHash.slice(0, 16)}...
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {new Date(att.publishedAt * 1000).toLocaleString()}
                </span>
                <div className="flex justify-center">
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      isFresh
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {isFresh ? "valid" : "expired"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
