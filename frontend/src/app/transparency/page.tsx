"use client";

import { useState } from "react";
import { useAssets, useAttestations } from "@/lib/solana/hooks";
import { formatPercent, shortenAddress } from "@/lib/solana/format";

function timeAgo(unix: number, now: number): string {
  const diff = now - unix;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function timeLeft(unix: number, now: number): string {
  const diff = unix - now;
  if (diff <= 0) return "Expired";
  if (diff < 3600) return `${Math.floor(diff / 60)}m left`;
  return `${Math.floor(diff / 3600)}h left`;
}

export default function TransparencyPage() {
  const { data: assets, isLoading: loadingAssets } = useAssets();
  const { data: attestations, isLoading: loadingAtt } = useAttestations();
  const [now] = useState(() => Math.floor(Date.now() / 1000));
  const isLoading = loadingAssets || loadingAtt;

  const byAsset = new Map<string, typeof attestations>();
  for (const att of attestations ?? []) {
    if (!byAsset.has(att.assetPubkey)) byAsset.set(att.assetPubkey, []);
    byAsset.get(att.assetPubkey)!.push(att);
  }
  for (const [key, list] of byAsset) {
    byAsset.set(key, [...list!].sort((a, b) => b.publishedAt - a.publishedAt));
  }

  const totalAtts = attestations?.length ?? 0;
  const liveAtts = attestations?.filter((a) => a.validUntil > now).length ?? 0;
  const totalAssets = assets?.length ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Page header — center-aligned like Midas */}
      <div className="text-center mb-10">
        <h1
          className="text-5xl sm:text-6xl font-bold text-[var(--color-text)] mb-3"
          style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}
        >
          Transparency
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] max-w-lg mx-auto leading-relaxed">
          Explore on-chain attestation records and proof-of-reserve data for each registered token.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 border border-[var(--color-border)] bg-white mb-10">
        {[
          { label: "Registered Assets", value: isLoading ? "—" : String(totalAssets) },
          { label: "Total Attestations", value: isLoading ? "—" : String(totalAtts) },
          { label: "Live Attestations", value: isLoading ? "—" : String(liveAtts) },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`px-6 py-5 ${i < 2 ? "border-r border-[var(--color-border)]" : ""}`}
          >
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
              {stat.label}
            </p>
            <p className="text-4xl font-mono font-bold text-[var(--color-text)] leading-none">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Attestation engine card — like Midas attestation engine */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-white border border-[var(--color-border)] p-7">
          <h2 className="text-2xl font-bold text-[var(--color-text)] mb-3">
            ProofLayer Attestation Engine
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-5">
            The ProofLayer Attestation Engine is the trust layer powering compliant onchain RWA tokens.
            It transforms structured NAV and custody data into verifiable on-chain checkpoints, published
            every 24 hours on Solana.
          </p>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
            Powered by
          </p>
          <div className="flex items-center gap-3 mb-5">
            <span className="text-sm font-bold uppercase tracking-wide text-[var(--color-text)] border border-[var(--color-border)] px-3 py-1.5">
              Solana
            </span>
            <span className="text-[var(--color-text-muted)] text-sm">&amp;</span>
            <span className="text-sm font-bold uppercase tracking-wide text-[var(--color-text)] border border-[var(--color-border)] px-3 py-1.5">
              Token-2022
            </span>
          </div>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
            Track Record
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-secondary)] border border-[var(--color-border)] px-3 py-1.5">
              {totalAtts} Reports Published
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide"
              style={{ color: "var(--color-success)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "var(--color-success)" }} />
              Active since 2025
            </span>
          </div>
        </div>

        {/* Latest attestation panel */}
        <div className="bg-white border border-[var(--color-border)] p-7">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold uppercase tracking-wide text-[var(--color-text)]">
              Proof of Reserve
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[0.6rem] font-bold uppercase tracking-widest border px-2.5 py-1"
                style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)" }}>
                Latest
              </span>
            </div>
          </div>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
            Reserve NAV
          </p>
          <p className="text-3xl font-mono font-bold text-[var(--color-text)] mb-4">
            {isLoading ? "—" : totalAtts > 0
              ? `$${((attestations ?? []).reduce((s, a) => s + a.navBps, 0) / 10000 / Math.max(totalAtts, 1)).toFixed(2)}`
              : "$0.00"}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-5">
            Reference Strategy NAV disclosed by the attestors and subject to on-chain consistency checks.
          </p>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">
            Independently Verified by
          </p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-secondary)]">
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              On-chain Verifier
            </span>
          </div>
        </div>
      </div>

      {isLoading && (
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] py-8">
          Loading on-chain data…
        </p>
      )}

      {!isLoading && totalAtts === 0 && (
        <div className="border border-[var(--color-border)] bg-white px-6 py-16 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
            No attestations published yet
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            Attestors publish NAV + yield data on-chain every 24h
          </p>
        </div>
      )}

      {/* Attestation records */}
      <div className="space-y-5">
        {(assets ?? []).map((asset) => {
          const atts = byAsset.get(asset.pubkey) ?? [];
          const latest = atts[0];
          const isFresh = latest ? latest.validUntil > now : false;

          return (
            <div key={asset.pubkey} className="border border-[var(--color-border)] bg-white">

              {/* Asset header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="flex items-center gap-4">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-extrabold text-xs uppercase"
                    style={{ background: "var(--color-accent)" }}
                  >
                    {asset.assetType.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-text)]">
                      {asset.assetType} · {shortenAddress(asset.mint, 8)}
                    </p>
                    <p className="text-xs font-mono text-[var(--color-text-muted)] mt-0.5">
                      Registry: {shortenAddress(asset.pubkey, 6)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[0.6rem] font-bold uppercase tracking-widest border px-2.5 py-1 ${
                    isFresh
                      ? "border-[var(--color-success)] text-[var(--color-success)]"
                      : atts.length === 0
                        ? "border-[var(--color-text-muted)] text-[var(--color-text-muted)]"
                        : "border-[var(--color-danger)] text-[var(--color-danger)]"
                  }`}>
                    {atts.length === 0 ? "No Attestations" : isFresh ? "Live" : "Stale"}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                    {atts.length} record{atts.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Table */}
              {atts.length > 0 && (
                <>
                  <div className="grid grid-cols-[1fr_0.7fr_0.7fr_2fr_1fr_0.8fr] gap-4 px-6 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                    {["Published", "NAV", "Yield", "Proof Hash", "Valid Until", "Status"].map((col, i) => (
                      <span key={col} className={`text-[0.6rem] font-bold uppercase tracking-widest text-[var(--color-text-muted)] ${i > 0 ? "text-right" : ""}`}>
                        {col}
                      </span>
                    ))}
                  </div>

                  {atts.map((att, idx) => {
                    const fresh = att.validUntil > now;
                    const isLatest = idx === 0;
                    return (
                      <div
                        key={att.pubkey}
                        className={`grid grid-cols-[1fr_0.7fr_0.7fr_2fr_1fr_0.8fr] gap-4 px-6 py-4 items-center border-b border-[var(--color-border-subtle)] last:border-b-0 transition-colors ${
                          isLatest ? "bg-white" : "bg-[var(--color-surface-secondary)] opacity-60"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-mono text-[var(--color-text)]">{timeAgo(att.publishedAt, now)}</p>
                          <p className="text-xs font-mono text-[var(--color-text-muted)] mt-0.5">
                            {new Date(att.publishedAt * 1000).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-sm font-mono font-bold text-[var(--color-text)] text-right tabular-nums">
                          ${(att.navBps / 10000).toFixed(4)}
                        </p>
                        <p className="text-sm font-mono font-bold text-right tabular-nums" style={{ color: "var(--color-accent)" }}>
                          {formatPercent(att.yieldRateBps / 100)}
                        </p>
                        <div className="text-right">
                          <p className="text-xs font-mono text-[var(--color-text-secondary)] break-all">
                            {att.proofHash.slice(0, 24)}…
                          </p>
                          <p className="text-[0.6rem] font-mono text-[var(--color-text-muted)] mt-0.5">
                            SHA-256 · {att.proofHash.length / 2} bytes
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono text-[var(--color-text)]">{timeLeft(att.validUntil, now)}</p>
                          <p className="text-xs font-mono text-[var(--color-text-muted)] mt-0.5">
                            {new Date(att.validUntil * 1000).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex justify-end">
                          <span className={`text-[0.6rem] font-bold uppercase tracking-widest border px-2 py-0.5 ${
                            fresh
                              ? "border-[var(--color-success)] text-[var(--color-success)]"
                              : "border-[var(--color-text-muted)] text-[var(--color-text-muted)]"
                          }`}>
                            {fresh ? "Live" : "Expired"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {atts.length === 0 && (
                <div className="px-6 py-10 text-center text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                  Awaiting first attestation
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isLoading && totalAtts > 0 && (
        <div className="mt-8 border-t border-[var(--color-border)] pt-5 flex flex-wrap gap-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
            Proof hash — SHA-256 of the off-chain custody document, signed by the attestor keypair
          </p>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
            Dimmed rows — superseded attestations (historical record)
          </p>
        </div>
      )}
    </div>
  );
}
