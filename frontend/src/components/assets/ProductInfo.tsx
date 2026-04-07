"use client";

import { MappedAsset } from "@/lib/solana/hooks";
import { formatPercent } from "@/lib/solana/format";
import { AttestationBadge } from "@/components/policy/AttestationBadge";
import { StatusBadge } from "@/components/policy/StatusBadge";
import { useAssetMeta } from "@/lib/api/hooks";

interface ProductInfoProps {
  asset: MappedAsset;
  navBps: number | null;
  yieldBps: number | null;
  attestationFresh: boolean | null;
  attestationValidUntil: number;
}

export function ProductInfo({
  asset,
  navBps,
  yieldBps,
  attestationFresh,
  attestationValidUntil,
}: ProductInfoProps) {
  const price = navBps ? navBps / 10000 : null;
  const { data: meta } = useAssetMeta(asset.pubkey);

  return (
    <div>
      <div className="flex items-start gap-4 mb-5">
        {meta?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={meta.imageUrl}
            alt={asset.name}
            className="w-14 h-14 rounded-full object-contain shrink-0 border border-[var(--color-border)] bg-white"
          />
        ) : (
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-extrabold text-sm shrink-0 uppercase"
            style={{ background: "var(--color-accent)" }}
          >
            {asset.assetType.slice(0, 2)}
          </div>
        )}
        <div>
          <h1 className="text-5xl font-extrabold uppercase tracking-tight text-[var(--color-text)] leading-none">
            {meta?.name ?? `${asset.assetType} Asset`}
          </h1>
          <p className="text-xs font-mono text-[var(--color-text-muted)] mt-2 break-all">
            {asset.mint}
          </p>
        </div>
      </div>

      <p className="text-xs text-[var(--color-text-muted)] mb-2">
        In Partnership With{" "}
        <a href="https://prooflayer.io" target="_blank" rel="noopener noreferrer" className="font-bold text-[var(--color-text-secondary)] uppercase tracking-wide hover:text-[var(--color-accent)] transition-colors">
          ProofLayer ↗
        </a>
      </p>

      <div className="flex items-center gap-2 mb-8">
        <StatusBadge status={asset.status} />
        {attestationFresh !== null && (
          <AttestationBadge isFresh={attestationFresh} validUntil={attestationValidUntil} />
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-0 border border-[var(--color-border)] mb-6">
        <div
          className="px-5 py-5 border-r border-[var(--color-border)]"
          style={{ background: "var(--color-dark)" }}
        >
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-white/40 mb-2">
            Yield APY
          </p>
          <p className="text-4xl font-extrabold uppercase tracking-tight leading-none text-white">
            {yieldBps !== null ? formatPercent(yieldBps / 100) : "—"}
          </p>
        </div>

        <div className="px-5 py-5 border-r border-[var(--color-border)] bg-white">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-[var(--color-text-muted)] mb-2">
            NAV Price
          </p>
          <p className="text-4xl font-mono font-bold text-[var(--color-text)] leading-none">
            {price !== null ? `$${price.toFixed(4)}` : "—"}
          </p>
        </div>

        <div className="px-5 py-5 bg-white">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-[var(--color-text-muted)] mb-2">
            TVL
          </p>
          <p className="text-4xl font-mono font-bold text-[var(--color-text)] leading-none">
            —
          </p>
        </div>
      </div>
    </div>
  );
}
