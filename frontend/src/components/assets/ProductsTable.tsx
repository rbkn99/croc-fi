"use client";

import { useState } from "react";
import Link from "next/link";
import { MappedAsset, MappedAttestation } from "@/lib/solana/hooks";
import { formatPercent, shortenAddress } from "@/lib/solana/format";
import { NetworkIcon } from "./NetworkIcon";

interface ProductsTableProps {
  assets: MappedAsset[];
  attestations: MappedAttestation[];
}

export function ProductsTable({ assets, attestations }: ProductsTableProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = ["all", ...new Set(assets.map((a) => a.assetType))];

  const latestAtt = new Map<string, MappedAttestation>();
  for (const att of attestations) {
    const existing = latestAtt.get(att.assetPubkey);
    if (!existing || att.publishedAt > existing.publishedAt) {
      latestAtt.set(att.assetPubkey, att);
    }
  }

  const filtered = assets.filter((a) => {
    const matchesSearch =
      a.pubkey.toLowerCase().includes(search.toLowerCase()) ||
      a.mint.toLowerCase().includes(search.toLowerCase()) ||
      a.assetType.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || a.assetType === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      {/* Filters row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        {/* Category dropdowns — styled like Midas filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wide border transition-colors ${
                category === cat
                  ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-glow)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search name or address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-60 pl-8 pr-3 py-2 text-xs font-bold uppercase tracking-wide bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
          <svg className="absolute left-2.5 top-2.5 w-3 h-3 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[var(--color-border)]">
        {/* Column headers */}
        <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          {[
            { label: "Product", align: "" },
            { label: "Strategy", align: "text-right" },
            { label: "NAV", align: "text-right" },
            { label: "APY", align: "text-right" },
            { label: "Network", align: "text-center" },
          ].map(({ label, align }) => (
            <span key={label} className={`text-[0.65rem] font-bold uppercase tracking-widest text-[var(--color-text-muted)] ${align}`}>
              {label}
            </span>
          ))}
        </div>

        {filtered.length > 0 ? (
          filtered.map((asset) => {
            const att = latestAtt.get(asset.pubkey);
            return (
              <Link
                key={asset.pubkey}
                href={`/products/${asset.pubkey}`}
                className="group grid grid-cols-[2.5fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-4 items-center border-b border-[var(--color-border-subtle)] last:border-b-0 hover:bg-[var(--color-surface)] transition-colors"
              >
                {/* Product */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 flex items-center justify-center text-white font-extrabold text-xs shrink-0 uppercase rounded-full"
                    style={{ background: "var(--color-accent)" }}
                  >
                    {asset.assetType.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors truncate">
                      {shortenAddress(asset.mint, 6)}
                    </p>
                    <p className="text-[0.65rem] font-bold uppercase tracking-widest px-1.5 py-0.5 mt-0.5 inline-block"
                      style={{
                        background: "var(--color-accent-glow)",
                        color: "var(--color-accent)",
                        border: "1px solid rgba(23,124,65,0.2)",
                      }}>
                      {asset.assetType}
                    </p>
                  </div>
                </div>

                {/* Strategy */}
                <div className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] text-right">
                  ProofLayer
                </div>

                {/* NAV */}
                <div className="text-sm font-mono font-semibold text-[var(--color-text)] text-right tabular-nums">
                  {att ? `$${(att.navBps / 10000).toFixed(4)}` : "—"}
                </div>

                {/* Yield */}
                <div className="text-right">
                  <span className="text-sm font-mono font-bold text-[var(--color-text)]">
                    {att ? formatPercent(att.yieldRateBps / 100) : "—"}
                  </span>
                </div>

                {/* Network */}
                <div className="flex justify-center">
                  <NetworkIcon network="solana" size={20} />
                </div>
              </Link>
            );
          })
        ) : (
          <div className="px-5 py-16 text-center text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
            No products found
          </div>
        )}
      </div>
    </div>
  );
}
