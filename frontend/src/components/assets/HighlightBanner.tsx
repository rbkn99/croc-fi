"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useProducts } from "@/lib/api/hooks";

export function HighlightBanner() {
  const { data: products } = useProducts();
  const [active, setActive] = useState(0);

  const items = products ?? [];

  // Auto-advance every 4 seconds
  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % items.length);
    }, 4000);
    return () => clearInterval(id);
  }, [items.length]);

  if (items.length === 0) return null;

  const product = items[active];
  const initials = product.ticker?.slice(0, 2).toUpperCase() ?? product.name.slice(0, 2).toUpperCase();

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--color-text-muted)] mb-4">
        Highlights
      </p>

      <Link
        href={`/products/${product.id}`}
        className="block relative overflow-hidden border p-8 flex flex-col lg:flex-row items-start lg:items-center gap-6 hover:border-[rgba(23,124,65,0.6)] transition-colors"
        style={{
          background:
            "linear-gradient(135deg, rgba(23,124,65,0.12) 0%, rgba(46,204,113,0.06) 50%, rgba(23,124,65,0.04) 100%)",
          borderColor: "rgba(23,124,65,0.3)",
        }}
      >
        {/* Decorative radial glow */}
        <div
          className="absolute left-0 top-0 w-64 h-64 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 20% 40%, rgba(46,204,113,0.15) 0%, transparent 60%)",
          }}
        />

        {/* Token icon */}
        <div className="relative shrink-0 w-20 h-20 flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full border" style={{ borderColor: "rgba(46,204,113,0.2)" }} />
          <div className="absolute w-14 h-14 rounded-full border" style={{ borderColor: "rgba(46,204,113,0.3)" }} />
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm"
            style={{ background: "var(--color-accent)" }}
          >
            {initials}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div
            className="inline-block text-[0.65rem] font-bold uppercase tracking-widest border px-2.5 py-1 mb-3"
            style={{ borderColor: "rgba(23,124,65,0.4)", color: "var(--color-accent-bright)" }}
          >
            {product.assetType}
          </div>
          <h3 className="text-2xl font-bold uppercase tracking-tight text-[var(--color-text)] mb-2">
            {product.name}
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-md leading-relaxed line-clamp-2">
            {product.description}
          </p>
        </div>

        {/* Stats */}
        <div className="shrink-0 text-right space-y-1">
          {(product.apy ?? 0) > 0 && (
            <div>
              <p className="text-[0.6rem] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">APY</p>
              <p className="text-xl font-extrabold" style={{ color: "var(--color-accent-bright)" }}>
                {(product.apy ?? 0).toFixed(2)}%
              </p>
            </div>
          )}
          <div className="flex items-center gap-2 justify-end mt-2">
            <span className="text-xs font-bold uppercase tracking-widest border border-[var(--color-border)] text-[var(--color-text-secondary)] px-3 py-1.5">
              Token-2022
            </span>
            <span
              className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 text-white"
              style={{ background: "var(--color-accent)" }}
            >
              ProofLayer
            </span>
          </div>
        </div>
      </Link>

      {/* Pagination dots */}
      {items.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Slide ${i + 1}`}
              className="transition-all duration-300"
              style={{
                width: i === active ? "20px" : "6px",
                height: "6px",
                borderRadius: "9999px",
                background: i === active ? "var(--color-accent)" : "var(--color-border)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
