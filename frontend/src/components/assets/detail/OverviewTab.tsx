"use client";

import { AssetMetadata } from "@/lib/api/types";
import { bpsToPercent, formatPercent, shortenAddress } from "@/lib/solana/format";

interface OverviewTabProps {
  meta: AssetMetadata;
}

export function OverviewTab({ meta }: OverviewTabProps) {
  return (
    <div className="space-y-8">
      {/* About */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 uppercase tracking-wider">
          About
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {meta.description}
        </p>
      </section>

      {/* Underlying Asset */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 uppercase tracking-wider">
          Underlying Asset
        </h3>
        <div className="bg-white rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
          <Row label="Description" value={meta.underlying.description} />
          {meta.underlying.benchmark && (
            <Row label="Benchmark" value={meta.underlying.benchmark} />
          )}
          {meta.underlying.maturityRange && (
            <Row label="Maturity Range" value={meta.underlying.maturityRange} />
          )}
          {meta.underlying.creditRating && (
            <Row label="Credit Rating" value={meta.underlying.creditRating} />
          )}
          {meta.underlying.averageDuration && (
            <Row label="Avg Duration" value={meta.underlying.averageDuration} />
          )}
          {meta.underlying.concentrationLimit && (
            <Row label="Concentration Limit" value={meta.underlying.concentrationLimit} />
          )}
        </div>
      </section>

      {/* Fees */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 uppercase tracking-wider">
          Fee Schedule
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <FeeCard label="Management" bps={meta.fees.managementFeeBps} />
          <FeeCard label="Performance" bps={meta.fees.performanceFeeBps} />
          <FeeCard label="Mint" bps={meta.fees.mintFeeBps} />
          <FeeCard label="Redeem" bps={meta.fees.redeemFeeBps} />
        </div>
      </section>

      {/* Counterparties */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 uppercase tracking-wider">
          Service Providers
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {meta.counterparties.map((cp, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-[var(--color-border)] px-4 py-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase text-[var(--color-text-muted)] tracking-wider">
                  {cp.role.replace(/_/g, " ")}
                </span>
                {cp.jurisdiction && (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {cp.jurisdiction}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-[var(--color-text)]">
                {cp.url ? (
                  <a
                    href={cp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--color-primary)] transition-colors underline decoration-dotted underline-offset-2"
                  >
                    {cp.name}
                  </a>
                ) : (
                  cp.name
                )}
              </p>
              {cp.description && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                  {cp.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* On-chain addresses */}
      {(meta.mintPubkey || meta.issuerPubkey || meta.attestorPubkey) && (
        <section>
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 uppercase tracking-wider">
            On-chain Addresses
          </h3>
          <div className="bg-white rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
            {meta.mintPubkey && (
              <Row label="Token Mint" value={shortenAddress(meta.mintPubkey, 8)} mono />
            )}
            {meta.issuerPubkey && (
              <Row label="Issuer" value={shortenAddress(meta.issuerPubkey, 8)} mono />
            )}
            {meta.attestorPubkey && (
              <Row label="Attestor" value={shortenAddress(meta.attestorPubkey, 8)} mono />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between px-4 py-3 gap-4">
      <span className="text-xs text-[var(--color-text-muted)] shrink-0">
        {label}
      </span>
      <span
        className={`text-sm text-right text-[var(--color-text-secondary)] ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function FeeCard({ label, bps }: { label: string; bps: number }) {
  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] px-4 py-3 text-center">
      <p className="text-xs text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className="text-lg font-bold font-mono text-[var(--color-text)]">
        {formatPercent(bpsToPercent(bps))}
      </p>
      <p className="text-xs text-[var(--color-text-muted)]">{bps} bps</p>
    </div>
  );
}
