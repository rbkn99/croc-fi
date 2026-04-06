"use client";
export const dynamic = "force-dynamic";

import { use, useState } from "react";
import { useAssets, useAttestations } from "@/lib/solana/hooks";
import { ProductInfo } from "@/components/assets/ProductInfo";
import { InvestRedeemCard } from "@/components/transactions/InvestRedeemCard";
import Link from "next/link";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default function ProductPage({ params }: ProductPageProps) {
  const { id } = use(params);
  const { data: assets, isLoading } = useAssets();
  const { data: attestations } = useAttestations();
  const [now] = useState(() => Math.floor(Date.now() / 1000));

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-xs font-mono tracking-widest text-[var(--color-text-muted)]">Loading…</p>
      </div>
    );
  }

  const asset = assets?.find((a) => a.pubkey === id);
  if (!asset) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-xs font-mono tracking-widest text-[var(--color-text-muted)] mb-4">Asset not found</p>
        <Link href="/products" className="text-xs font-mono tracking-wider text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] transition-colors">
          ← Back to products
        </Link>
      </div>
    );
  }

  const assetAttestations = (attestations ?? []).filter((a) => a.assetPubkey === id);
  const latestAtt = assetAttestations.length > 0
    ? assetAttestations.reduce((best, a) => (a.publishedAt > best.publishedAt ? a : best), assetAttestations[0])
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 items-start">
        <ProductInfo
          asset={asset}
          navBps={latestAtt?.navBps ?? null}
          yieldBps={latestAtt?.yieldRateBps ?? null}
          attestationFresh={latestAtt ? latestAtt.validUntil > now : false}
          attestationValidUntil={latestAtt?.validUntil ?? 0}
        />
        <InvestRedeemCard
          asset={asset}
          navBps={latestAtt?.navBps ?? 10000}
        />
      </div>
    </div>
  );
}
