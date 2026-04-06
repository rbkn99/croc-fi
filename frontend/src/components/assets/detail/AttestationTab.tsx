"use client";

import { useState } from "react";
import { Product } from "@/lib/api/types";
import { useAssetAttestation } from "@/lib/api/hooks";
import {
  bpsToPercent,
  formatPercent,
} from "@/lib/solana/format";

interface AttestationTabProps {
  product: Product;
}

export function AttestationTab({ product }: AttestationTabProps) {
  const { data: attestation, isLoading, error } = useAssetAttestation(
    product.onChainPubkey ?? undefined
  );

  const [now] = useState(() => Math.floor(Date.now() / 1000));
  const isFresh = product.isFresh ?? product.attestationFresh ?? false;
  const validUntil = product.attestationValidUntil ?? 0;
  const remaining = validUntil - now;
  const hours = Math.max(0, Math.floor(remaining / 3600));
  const minutes = Math.max(0, Math.floor((remaining % 3600) / 60));

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div
        className={`rounded-xl px-5 py-4 flex items-center gap-3 ${
          isFresh
            ? "bg-emerald-50 border border-emerald-200"
            : "bg-red-50 border border-red-200"
        }`}
      >
        <div
          className={`w-3 h-3 rounded-full ${
            isFresh ? "bg-emerald-500" : "bg-red-500 animate-pulse"
          }`}
        />
        <div>
          <p
            className={`text-sm font-semibold ${
              isFresh ? "text-emerald-800" : "text-red-800"
            }`}
          >
            {isFresh ? "Attestation Fresh" : "Attestation Stale"}
          </p>
          <p
            className={`text-xs ${
              isFresh ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {isFresh
              ? `Valid for ${hours}h ${minutes}m`
              : "Expired — transfers are blocked until a new attestation is published"}
          </p>
        </div>
      </div>

      {/* How it works */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 uppercase tracking-wider">
          How Attestation Works
        </h3>
        <div className="bg-white rounded-xl border border-[var(--color-border)] px-5 py-4 space-y-3">
          <Step
            num={1}
            title="NAV Agent Strike"
            desc="Independent NAV agent (e.g. NAV Consulting) calculates daily fund NAV based on custodied assets."
          />
          <Step
            num={2}
            title="ProofLayer Attestor"
            desc="The attestor service fetches NAV, yield rate, and proof-of-reserve data, computes a SHA-256 proof hash, and publishes the attestation on-chain."
          />
          <Step
            num={3}
            title="On-chain Record"
            desc="AttestationRecord PDA stores NAV (bps), yield rate (bps), proof hash, and validity window. Token-2022 InterestBearingMint rate is updated simultaneously."
          />
          <Step
            num={4}
            title="Transfer Hook Enforcement"
            desc="Every token transfer is validated by the TransferHook program, which checks that attestation.valid_until > now. Stale attestation = blocked transfers."
          />
        </div>
      </section>

      {/* Latest attestation data */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 uppercase tracking-wider">
          Latest Attestation Data
        </h3>
        {attestation ? (
          <div className="bg-white rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
            <Row label="NAV" value={`${formatPercent(bpsToPercent(attestation.navBps))} (${attestation.navBps} bps)`} />
            <Row label="Yield Rate" value={`${formatPercent(bpsToPercent(attestation.yieldRateBps))} (${attestation.yieldRateBps} bps)`} />
            <Row label="Proof Hash" value={attestation.proofHash} mono truncate />
            <Row label="Published At" value={new Date(attestation.publishedAt * 1000).toLocaleString()} />
            <Row label="Valid Until" value={new Date(attestation.validUntil * 1000).toLocaleString()} />
            <Row label="Status" value={attestation.isFresh ? "Fresh" : "Expired"} />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
            <Row label="NAV (7d APY)" value={formatPercent(product.apy7d)} />
            <Row
              label="Valid Until"
              value={new Date(validUntil * 1000).toLocaleString()}
            />
            <Row label="Status" value={isFresh ? "Fresh" : "Expired"} />
            {!attestation && !isLoading && (
              <div className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                {error
                  ? "Backend unavailable — showing cached product data"
                  : "On-chain attestation data not yet available"}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Verification */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 uppercase tracking-wider">
          Verify Yourself
        </h3>
        <div className="bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)] px-5 py-4 text-sm text-[var(--color-text-secondary)] space-y-2">
          <p>
            All attestation data is stored on-chain and can be independently verified:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-[var(--color-text-muted)]">
            <li>Fetch the <code className="text-xs bg-gray-100 px-1 rounded">AttestationRecord</code> PDA using the asset registry pubkey</li>
            <li>Verify the <code className="text-xs bg-gray-100 px-1 rounded">proof_hash</code> against the published proof-of-reserve document</li>
            <li>Check <code className="text-xs bg-gray-100 px-1 rounded">valid_until</code> against current slot time</li>
            <li>Compare <code className="text-xs bg-gray-100 px-1 rounded">yield_rate_bps</code> to the InterestBearingMint rate on the token</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

function Step({
  num,
  title,
  desc,
}: {
  num: number;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {num}
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          {desc}
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  truncate,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-start justify-between px-4 py-3 gap-4">
      <span className="text-xs text-[var(--color-text-muted)] shrink-0">
        {label}
      </span>
      <span
        className={`text-sm text-right text-[var(--color-text-secondary)] ${
          mono ? "font-mono text-xs" : ""
        } ${truncate ? "truncate max-w-[200px]" : ""}`}
        title={truncate ? value : undefined}
      >
        {value}
      </span>
    </div>
  );
}
