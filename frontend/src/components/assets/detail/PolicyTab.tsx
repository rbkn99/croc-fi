"use client";

import { useAssetPolicy } from "@/lib/api/hooks";

interface PolicyTabProps {
  assetId: string;
}

export function PolicyTab({ assetId }: PolicyTabProps) {
  const { data: policy, isLoading, error } = useAssetPolicy(assetId);

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
        Loading policy...
      </div>
    );
  }

  if (error || !policy) {
    return (
      <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
        Policy data unavailable — backend may be offline
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 uppercase tracking-wider">
          Compliance Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SummaryCard
            label="Transfer Hook"
            value={policy.transferHookEnforced ? "Enforced" : "Disabled"}
            active={policy.transferHookEnforced}
          />
          <SummaryCard
            label="KYC Required"
            value={policy.requireKyc ? "Yes" : "No"}
            active={policy.requireKyc}
          />
          <SummaryCard
            label="Required Tier"
            value={policy.requiredTier.replace(/_/g, " ")}
            active
          />
        </div>
      </section>

      {/* Investor Restrictions */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 uppercase tracking-wider">
          Investor Restrictions
        </h3>
        <div className="bg-white rounded-xl border border-[var(--color-border)] px-4 py-3">
          <ul className="space-y-2">
            {policy.investorRestrictions.map((r: string, i: number) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Attestation Requirement */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 uppercase tracking-wider">
          Attestation Requirement
        </h3>
        <div className="bg-white rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
          <Row
            label="Fresh Attestation Required"
            value={policy.attestationRequirement.requireFresh ? "Yes" : "No"}
          />
          <Row
            label="Max Attestation Age"
            value={`${Math.round(policy.attestationRequirement.maxAgeSec / 3600)} hours`}
          />
          <Row label="Source" value={policy.attestationRequirement.source} />
        </div>
      </section>

      {/* Compliance Checks */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 uppercase tracking-wider">
          Compliance Checks Pipeline
        </h3>
        <div className="bg-white rounded-xl border border-[var(--color-border)] px-4 py-3">
          <ol className="space-y-2">
            {policy.complianceChecks.map((check: string, i: number) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm text-[var(--color-text-secondary)]"
              >
                <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {check}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* On-chain Enforcement */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 uppercase tracking-wider">
          On-chain Enforcement (TransferHook)
        </h3>
        <div className="bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)] px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">
              Program:
            </span>
            <code className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-secondary)]">
              {policy.onChainEnforcement.program}
            </code>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Every token transfer executes the following checks atomically:
          </p>
          <div className="space-y-2">
            {policy.onChainEnforcement.checks.map((check: string, i: number) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-white rounded-lg border border-[var(--color-border)] px-3 py-2"
              >
                <CheckIcon />
                <code className="text-xs font-mono text-[var(--color-text-secondary)]">
                  {check}
                </code>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Whitelist Model */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 uppercase tracking-wider">
          Whitelist Model
        </h3>
        <div className="bg-white rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          {policy.whitelistModel}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] px-4 py-3 text-center">
      <p className="text-xs text-[var(--color-text-muted)] mb-1">{label}</p>
      <p
        className={`text-sm font-semibold capitalize ${
          active
            ? "text-emerald-700"
            : "text-[var(--color-text-muted)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between px-4 py-3 gap-4">
      <span className="text-xs text-[var(--color-text-muted)] shrink-0">
        {label}
      </span>
      <span className="text-sm text-right text-[var(--color-text-secondary)]">
        {value}
      </span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-emerald-500 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
