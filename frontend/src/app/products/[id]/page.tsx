"use client";
export const dynamic = "force-dynamic";

import { use } from "react";
import { useProduct } from "@/lib/api/hooks";
import { ProductInfo } from "@/components/assets/ProductInfo";
import { InvestRedeemCard } from "@/components/transactions/InvestRedeemCard";
import type { MappedAsset } from "@/lib/solana/hooks";
import Link from "next/link";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default function ProductPage({ params }: ProductPageProps) {
  const { id } = use(params);
  const { data: product, isLoading } = useProduct(id);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-xs font-mono tracking-widest text-[var(--color-text-muted)]">Loading…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-xs font-mono tracking-widest text-[var(--color-text-muted)] mb-4">Asset not found</p>
        <Link href="/products" className="text-xs font-mono tracking-wider text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] transition-colors">
          ← Back to products
        </Link>
      </div>
    );
  }

  // Adapt API Product to MappedAsset shape expected by child components
  const asset: MappedAsset = {
    pubkey: product.id,
    mint: product.mintPubkey ?? product.id,
    issuer: product.onChainPubkey ?? "",
    name: product.name,
    assetType: product.assetType,
    status: product.status ?? "active",
    createdAt: 0,
    minMintAmount: 0,
    minRedeemAmount: 0,
    dailyMintLimit: 0,
    dailyRedeemLimit: 0,
    dailyMinted: 0,
    dailyRedeemed: 0,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 items-start">
        <ProductInfo
          asset={asset}
          navBps={product.navBps ?? null}
          yieldBps={product.yieldRateBps ?? null}
          attestationFresh={product.isFresh ?? null}
          attestationValidUntil={0}
        />
        <InvestRedeemCard
          asset={asset}
          navBps={product.navBps ?? 10000}
        />
      </div>
    </div>
  );
}
