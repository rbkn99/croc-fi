"use client";
export const dynamic = "force-dynamic";

import { useSelectedWalletAccount } from "@solana/react";
import { useKycStatus, useStartKyc } from "@/lib/api/hooks";

function StatusIcon({ status }: { status: string }) {
  if (status === "approved") return (
    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(23,124,65,0.1)", border: "2px solid var(--color-accent)" }}>
      <svg width="28" height="28" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
  if (status === "pending") return (
    <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-amber-400 bg-amber-50">
      <svg width="28" height="28" fill="none" stroke="#d97706" strokeWidth="2.5" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </div>
  );
  if (status === "rejected") return (
    <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-red-400 bg-red-50">
      <svg width="28" height="28" fill="none" stroke="#dc2626" strokeWidth="2.5" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    </div>
  );
  // not_started / expired
  return (
    <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-[var(--color-border)] bg-[var(--color-surface)]">
      <svg width="28" height="28" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  );
}

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  not_started: {
    title: "Verify your identity",
    body: "ProofLayer requires KYC verification before you can invest in RWA tokens. The process takes 2–5 minutes and is handled by our verification provider.",
  },
  pending: {
    title: "Verification in progress",
    body: "Your identity verification is being reviewed. This usually takes a few minutes. You'll be able to invest once approved.",
  },
  approved: {
    title: "Identity verified",
    body: "Your KYC is approved. You can now invest in any ProofLayer RWA token you're whitelisted for.",
  },
  rejected: {
    title: "Verification rejected",
    body: "Your identity verification was not successful. Please resubmit with valid documents.",
  },
  expired: {
    title: "Verification expired",
    body: "Your KYC has expired and must be renewed to continue investing. The renewal process is quick.",
  },
};

const STEPS = [
  { n: "01", label: "Connect wallet", done: true },
  { n: "02", label: "Fill in personal details" },
  { n: "03", label: "Upload ID document" },
  { n: "04", label: "Instant review" },
];

export default function KycPage() {
  const [account] = useSelectedWalletAccount();
  const { data: kyc, isLoading } = useKycStatus();
  const startKyc = useStartKyc();

  const status = kyc?.status ?? "not_started";
  const copy = STATUS_COPY[status] ?? STATUS_COPY.not_started;
  const canStart = status === "not_started" || status === "rejected" || status === "expired";

  function handleStart() {
    startKyc.mutate(undefined, {
      onSuccess: (data) => {
        if (data.verificationUrl) window.open(data.verificationUrl, "_blank");
      },
    });
  }

  if (!account) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-text-muted)] mb-4">KYC Verification</p>
        <h1 className="text-4xl font-extrabold uppercase tracking-tight text-[var(--color-text)] mb-4">Connect Wallet</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Connect your wallet to start identity verification.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-16 items-start">

        {/* Left — explanation */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--color-text-muted)] mb-4">KYC Verification</p>
          <h1 className="text-5xl font-extrabold uppercase tracking-tight text-[var(--color-text)] leading-none mb-6">
            Investor<br />Verification
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-md leading-relaxed mb-10">
            ProofLayer RWA tokens are restricted to verified investors. Complete KYC once and invest across all products.
          </p>

          <div className="space-y-0">
            {STEPS.map((s, i) => (
              <div key={s.n} className={`flex gap-5 py-5 ${i < STEPS.length - 1 ? "border-b border-[var(--color-border)]" : ""}`}>
                <span className="text-sm font-extrabold font-mono shrink-0 mt-0.5 w-6 text-[var(--color-text-muted)]">{s.n}</span>
                <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--color-text)]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — status card */}
        <div className="border border-[var(--color-border)] bg-white p-8">
          {isLoading ? (
            <p className="text-xs font-mono tracking-widest text-[var(--color-text-muted)]">Loading…</p>
          ) : (
            <div className="flex flex-col items-center text-center gap-5">
              <StatusIcon status={status} />

              <div>
                <h2 className="text-xl font-extrabold uppercase tracking-tight text-[var(--color-text)] mb-2">
                  {copy.title}
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-xs">
                  {copy.body}
                </p>
              </div>

              {/* Tier / expiry info when approved */}
              {status === "approved" && kyc && (
                <div className="w-full border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                  {[
                    { label: "Tier", value: kyc.tier ?? "—" },
                    { label: "Status", value: "Active" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between px-4 py-2.5 text-xs">
                      <span className="font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{label}</span>
                      <span className="font-bold text-[var(--color-text)]">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Rejection reason */}
              {status === "rejected" && kyc?.rejectionReason && (
                <div className="w-full border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 text-left">
                  <p className="font-bold mb-0.5">Reason</p>
                  <p>{kyc.rejectionReason}</p>
                </div>
              )}

              {/* CTA */}
              {canStart && (
                <button
                  onClick={handleStart}
                  disabled={startKyc.isPending}
                  className="w-full py-4 text-sm font-extrabold uppercase tracking-widest text-white transition-colors disabled:opacity-40"
                  style={{ background: "var(--color-dark)" }}
                >
                  {startKyc.isPending ? "Starting…" : status === "not_started" ? "Start Verification" : "Resubmit Verification"}
                </button>
              )}

              {status === "pending" && (
                <div className="flex items-center gap-2 text-xs text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Review in progress — check back shortly
                </div>
              )}

              <p className="text-[0.65rem] text-[var(--color-text-muted)] leading-relaxed">
                Verification is powered by our KYC provider.<br />
                Your data is used solely for regulatory compliance.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
