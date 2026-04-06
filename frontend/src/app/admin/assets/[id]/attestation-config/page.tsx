"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelectedWalletAccount } from "@solana/react";
import { useAsset, useInitAttestationConfig } from "@/lib/solana/hooks";

export default function AttestationConfigPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [account] = useSelectedWalletAccount();
  const connected = !!account;
  const asset = useAsset(id);
  const initConfig = useInitAttestationConfig();

  const [attestorsInput, setAttestorsInput] = useState("");
  const [threshold, setThreshold] = useState("1");
  const [toleranceBps, setToleranceBps] = useState("200");
  const [validityDuration, setValidityDuration] = useState("86400");

  const attestors = attestorsInput
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 32);

  const canSubmit =
    connected &&
    attestors.length > 0 &&
    Number(threshold) > 0 &&
    Number(threshold) <= attestors.length &&
    Number(toleranceBps) > 0 &&
    Number(validityDuration) > 0 &&
    !initConfig.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !asset) return;

    await initConfig.mutateAsync({
      assetRegistryPubkey: asset.pubkey,
      attestors,
      threshold: Number(threshold),
      toleranceBps: Number(toleranceBps),
      validityDuration: BigInt(validityDuration),
    });
    router.push(`/admin/assets/${id}`);
  }

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
        Init Attestation Config
      </h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-8">
        Configure the attestation system for this asset. This sets up who can attest NAV values and the consensus parameters.
      </p>

      {!connected && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 mb-6">
          Connect your wallet to configure attestation.
        </div>
      )}

      {asset && (
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-3 mb-6">
          <p className="text-xs text-[var(--color-text-muted)]">Asset</p>
          <p className="text-sm font-mono font-semibold text-[var(--color-text)]">
            {asset.assetType} · {asset.pubkey.slice(0, 12)}...
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">
            Attestor Public Keys
          </label>
          <textarea
            rows={4}
            value={attestorsInput}
            onChange={(e) => setAttestorsInput(e.target.value)}
            placeholder="One pubkey per line or comma-separated"
            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-sm font-mono text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]/40"
          />
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {attestors.length} valid attestor{attestors.length !== 1 ? "s" : ""} detected (max 10)
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">
              Threshold
            </label>
            <input
              type="number"
              min="1"
              max={Math.max(attestors.length, 1)}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm font-mono text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Min votes to finalize
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">
              Tolerance (bps)
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              value={toleranceBps}
              onChange={(e) => setToleranceBps(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm font-mono text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              200 = 2% max deviation
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">
              Validity (seconds)
            </label>
            <input
              type="number"
              min="1"
              value={validityDuration}
              onChange={(e) => setValidityDuration(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm font-mono text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              86400 = 24 hours
            </p>
          </div>
        </div>

        {initConfig.error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {(initConfig.error as Error).message}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-sm hover:bg-[var(--color-primary-light)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {initConfig.isPending
            ? "Signing Transaction..."
            : "Initialize Attestation Config"}
        </button>
      </form>
    </div>
  );
}
