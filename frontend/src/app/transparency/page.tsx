"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { address } from "@solana/addresses";
import { useAttestations } from "@/lib/solana/hooks";
import { findAssetRegistryPda } from "@/lib/solana/generated/src/generated/pdas";
import { useProducts } from "@/lib/api/hooks";
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
  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: onChainAtts, isLoading: loadingAtts } = useAttestations();
  const [now] = useState(() => Math.floor(Date.now() / 1000));

  // Derive asset registry PDA for every product mint asynchronously
  const { data: mintToPda } = useQuery({
    queryKey: ["mint-to-pda", (products ?? []).map((p) => p.mintPubkey ?? p.id).join(",")],
    queryFn: async () => {
      const map = new Map<string, string>();
      await Promise.all(
        (products ?? []).map(async (p) => {
          const mint = p.mintPubkey ?? p.id;
          try {
            const [pda] = await findAssetRegistryPda({ rwaMint: address(mint) });
            map.set(p.id, String(pda));
          } catch {
            // invalid pubkey, skip
          }
        })
      );
      return map;
    },
    enabled: (products?.length ?? 0) > 0,
    staleTime: Infinity,
  });

  const isLoading = loadingProducts || loadingAtts;

  // Attestation lookup by asset PDA
  const attByAssetPda = new Map<string, NonNullable<typeof onChainAtts>[number]>();
  for (const att of onChainAtts ?? []) {
    attByAssetPda.set(att.assetPubkey, att);
  }

  const totalAtts = onChainAtts?.length ?? 0;
  const liveAtts = onChainAtts?.filter((a) => a.validUntil > now).length ?? 0;
  const totalAssets = products?.length ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Page header */}
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

      {/* Attestation engine card */}
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
            <span className="text-[0.6rem] font-bold uppercase tracking-widest border px-2.5 py-1"
              style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)" }}>
              Latest
            </span>
          </div>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
            Reserve NAV
          </p>
          <p className="text-3xl font-mono font-bold text-[var(--color-text)] mb-4">
            {isLoading ? "—" : totalAtts > 0
              ? `$${((onChainAtts ?? []).reduce((s, a) => s + a.navBps, 0) / 10000 / Math.max(totalAtts, 1)).toFixed(2)}`
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

      {/* Attestation records — one row per API product */}
      <div className="space-y-5">
        {(products ?? []).map((product) => {
          const assetPda = mintToPda?.get(product.id);
          const att = assetPda ? attByAssetPda.get(assetPda) : undefined;

          return (
            <div key={product.id} className="border border-[var(--color-border)] bg-white">

              {/* Asset header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="flex items-center gap-4">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-extrabold text-xs uppercase overflow-hidden"
                    style={{ background: "var(--color-accent)" }}
                  >
                    {product.imageUrl
                      ? <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                      : product.ticker.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-text)]">
                      {product.name} · {product.ticker}
                    </p>
                    <p className="text-xs font-mono text-[var(--color-text-muted)] mt-0.5">
                      Mint: {shortenAddress(product.mintPubkey ?? product.id, 8)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[0.6rem] font-bold uppercase tracking-widest border px-2.5 py-1 ${
                    att && att.validUntil > now
                      ? "border-[var(--color-success)] text-[var(--color-success)]"
                      : att
                        ? "border-[var(--color-danger)] text-[var(--color-danger)]"
                        : "border-[var(--color-text-muted)] text-[var(--color-text-muted)]"
                  }`}>
                    {!att ? "No Attestations" : att.validUntil > now ? "Live" : "Stale"}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                    {att ? "1 record" : "0 records"}
                  </span>
                </div>
              </div>

              {/* Attestation row */}
              {att && (
                <>
                  <div className="grid grid-cols-[1fr_0.7fr_0.7fr_2fr_1fr_0.8fr] gap-4 px-6 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                    {["Published", "NAV", "Yield", "Proof Hash", "Valid Until", "Status"].map((col, i) => (
                      <span key={col} className={`text-[0.6rem] font-bold uppercase tracking-widest text-[var(--color-text-muted)] ${i > 0 ? "text-right" : ""}`}>
                        {col}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-[1fr_0.7fr_0.7fr_2fr_1fr_0.8fr] gap-4 px-6 py-4 items-center bg-white">
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
                        att.validUntil > now
                          ? "border-[var(--color-success)] text-[var(--color-success)]"
                          : "border-[var(--color-text-muted)] text-[var(--color-text-muted)]"
                      }`}>
                        {att.validUntil > now ? "Live" : "Expired"}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {!att && (
                <div className="px-6 py-10 text-center text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                  Awaiting first attestation
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isLoading && totalAtts > 0 && (
        <div className="mt-8 border-t border-[var(--color-border)] pt-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
            Proof hash — SHA-256 of the off-chain custody document, signed by the attestor keypair
          </p>
        </div>
      )}
    </div>
  );
}
