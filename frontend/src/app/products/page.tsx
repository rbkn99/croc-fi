"use client";
export const dynamic = "force-dynamic";

import { useAssets, useAttestations } from "@/lib/solana/hooks";
import { HighlightBanner } from "@/components/assets/HighlightBanner";
import { ProductsTable } from "@/components/assets/ProductsTable";

export default function ProductsPage() {
  const { data: assets, isLoading: loadingAssets } = useAssets();
  const { data: attestations, isLoading: loadingAtt } = useAttestations();

  const isLoading = loadingAssets || loadingAtt;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <section className="mb-12">
        <HighlightBanner />
      </section>

      <section>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--color-text-muted)] mb-5">
          All Products
        </p>
        {isLoading ? (
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] py-10">
            Loading on-chain data…
          </p>
        ) : (
          <ProductsTable assets={assets ?? []} attestations={attestations ?? []} />
        )}
      </section>
    </div>
  );
}
