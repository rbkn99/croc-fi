"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/api/types";
import { NetworkIcon } from "./NetworkIcon";

interface ProductsTableProps {
  products: Product[];
}

export function ProductsTable({ products }: ProductsTableProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = ["all", ...new Set(products.map((p) => p.assetType))];

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.ticker.toLowerCase().includes(q) ||
      (p.mintPubkey ?? "").toLowerCase().includes(q) ||
      p.assetType.toLowerCase().includes(q);
    const matchesCategory = category === "all" || p.assetType === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      {/* Filters row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
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
          filtered.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="group grid grid-cols-[2.5fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-4 items-center border-b border-[var(--color-border-subtle)] last:border-b-0 hover:bg-[var(--color-surface)] transition-colors"
            >
              {/* Product */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 flex items-center justify-center text-white font-extrabold text-xs shrink-0 uppercase rounded-full overflow-hidden"
                  style={{ background: "var(--color-accent)" }}
                >
                  {product.imageUrl
                    ? <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                    : product.ticker.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold uppercase tracking-wide text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors truncate">
                    {product.name}
                  </p>
                  <p
                    className="text-[0.65rem] font-bold uppercase tracking-widest px-1.5 py-0.5 mt-0.5 inline-block"
                    style={{
                      background: "var(--color-accent-glow)",
                      color: "var(--color-accent)",
                      border: "1px solid rgba(23,124,65,0.2)",
                    }}
                  >
                    {product.assetType}
                  </p>
                </div>
              </div>

              {/* Strategy */}
              <div className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] text-right">
                ProofLayer
              </div>

              {/* NAV */}
              <div className="text-sm font-mono font-semibold text-[var(--color-text)] text-right tabular-nums">
                ${product.price.toFixed(4)}
              </div>

              {/* APY */}
              <div className="text-right">
                <span className="text-sm font-mono font-bold text-[var(--color-text)]">
                  {(product.apy ?? 0) > 0 ? `${(product.apy ?? 0).toFixed(2)}%` : "—"}
                </span>
              </div>

              {/* Network */}
              <div className="flex justify-center">
                <NetworkIcon network="solana" size={20} />
              </div>
            </Link>
          ))
        ) : (
          <div className="px-5 py-16 text-center text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
            No products found
          </div>
        )}
      </div>
    </div>
  );
}
