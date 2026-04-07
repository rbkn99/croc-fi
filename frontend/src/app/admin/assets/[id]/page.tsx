"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useSelectedWalletAccount } from "@solana/react";
import {
  useAttestations,
  useWhitelist,
  useRedemptionRequests,
  useTogglePause,
  useAddToWhitelist,
  useRemoveFromWhitelist,
  useFulfillRedemption,
  useRejectRedemption,
  useQuickAttest,
} from "@/lib/solana/hooks";
import { useProduct } from "@/lib/api/hooks";
import { findAssetRegistryPda } from "@/lib/solana/generated/src/generated/pdas";
import { address } from "@solana/kit";
import { formatPercent, shortenAddress } from "@/lib/solana/format";
import { StatusBadge } from "@/components/policy/StatusBadge";
import { AttestationBadge } from "@/components/policy/AttestationBadge";

interface AssetDetailPageProps {
  params: Promise<{ id: string }>;
}

function AddWhitelistModal({
  assetPubkey,
  onClose,
}: {
  assetPubkey: string;
  onClose: () => void;
}) {
  const [wallet, setWallet] = useState("");
  const addToWl = useAddToWhitelist();

  async function handleAdd() {
    if (!wallet.trim()) return;
    try {
      await addToWl.mutateAsync({
        assetRegistryPubkey: assetPubkey,
        walletAddress: wallet.trim(),
      });
      setWallet("");
      onClose();
    } catch (err) {
      console.error("Add to whitelist failed:", err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-xl">
        <div className="px-6 py-5 border-b border-[var(--color-border)]">
          <h3 className="text-lg font-bold text-[var(--color-text)]">Add to Whitelist</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Wallet Address</label>
            <input
              type="text"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="Solana wallet address"
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
          {addToWl.error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
              {(addToWl.error as Error).message}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-[var(--color-border)] flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-[var(--color-border)] text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!wallet.trim() || addToWl.isPending}
            className="flex-1 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary-light)] transition-colors disabled:opacity-40"
          >
            {addToWl.isPending ? "Signing..." : "Add Wallet"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AssetDetailPage({ params }: AssetDetailPageProps) {
  const { id } = use(params);
  const [account] = useSelectedWalletAccount(); const connected = !!account;
  const { data: product, isLoading } = useProduct(id);
  const { data: allAttestations } = useAttestations();
  const { data: allWhitelist } = useWhitelist();
  const togglePause = useTogglePause();
  const removeFromWl = useRemoveFromWhitelist();
  const { data: allRedemptions } = useRedemptionRequests();
  const fulfillRedemption = useFulfillRedemption();
  const rejectRedemption = useRejectRedemption();
  const quickAttest = useQuickAttest();
  const [showAddWl, setShowAddWl] = useState(false);
  const [now] = useState(() => Math.floor(Date.now() / 1000));
  const [registryPda, setRegistryPda] = useState<string | null>(null);

  const mintPubkey = product ? (product.mintPubkey ?? product.id) : null;

  useEffect(() => {
    if (!mintPubkey) return;
    findAssetRegistryPda({ rwaMint: address(mintPubkey) })
      .then(([pda]) => setRegistryPda(String(pda)))
      .catch((e) => console.warn("[AssetDetail] failed to derive registry PDA:", e));
  }, [mintPubkey]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-[var(--color-text-muted)]">Loading...</p>
      </div>
    );
  }

  const asset = product ? {
    pubkey: product.id,
    mint: product.mintPubkey ?? product.id,
    assetType: product.assetType,
    status: product.status ?? "unknown",
    name: product.name,
  } : null;

  if (!asset) {
    return (
      <div className="p-8 text-center">
        <p className="text-[var(--color-text-muted)]">Asset not found</p>
        <Link href="/admin" className="text-sm text-[var(--color-primary)] mt-2 inline-block">Back to dashboard</Link>
      </div>
    );
  }

  const assetPk = asset.pubkey;

  const attestations = (allAttestations ?? []).filter(
    (a) => a.assetPubkey === registryPda || a.assetPubkey === assetPk
  );
  const latestAttestation = attestations.length > 0
    ? attestations.reduce((best, a) => (a.publishedAt > best.publishedAt ? a : best), attestations[0])
    : null;
  const wlEntries = (allWhitelist ?? []).filter(
    (w) => w.assetPubkey === registryPda || w.assetPubkey === assetPk
  );
  const redemptions = (allRedemptions ?? []).filter(
    (r) => r.assetPubkey === registryPda || r.assetPubkey === assetPk
  );

  const hasAttestation = attestations.length > 0;
  const hasWhitelist = wlEntries.length > 0;
  const setupComplete = hasAttestation && hasWhitelist;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold">
              {asset.assetType.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text)]">{asset.assetType} Asset</h1>
              <p className="text-xs font-mono text-[var(--color-text-muted)]">{asset.pubkey}</p>
            </div>
          </div>
          <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-2">Mint: {asset.mint}</p>
          <div className="flex items-center gap-2 mt-3">
            <StatusBadge status={asset.status} />
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]">{asset.assetType}</span>
            {latestAttestation && (
              <AttestationBadge isFresh={latestAttestation.validUntil > now} validUntil={latestAttestation.validUntil} />
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => quickAttest.mutate({
              mintPubkey: asset.mint,
              navBps: 10000,
              yieldRateBps: 500,
            })}
            disabled={!connected || quickAttest.isPending}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-40"
          >
            {quickAttest.isPending ? "Signing..." : attestations.length === 0 ? "Quick Attest (NAV $1.00)" : "Re-Attest (NAV $1.00)"}
          </button>
          <button
            onClick={() => togglePause.mutate({ assetRegistryPubkey: assetPk, currentStatus: asset.status })}
            disabled={!connected || togglePause.isPending}
            className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors disabled:opacity-40 ${
              asset.status === "paused"
                ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                : "border-amber-300 text-amber-700 hover:bg-amber-50"
            }`}
          >
            {togglePause.isPending ? "Signing..." : asset.status === "paused" ? "Unpause" : "Pause"}
          </button>
        </div>
      </div>

      {quickAttest.error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 break-all">
          {String((quickAttest.error as Error)?.message ?? quickAttest.error)}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-[var(--color-border)] px-4 py-3">
          <p className="text-xs text-[var(--color-text-muted)]">NAV</p>
          <p className="text-lg font-bold font-mono">{latestAttestation ? (latestAttestation.navBps / 10000).toFixed(4) : "—"}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] px-4 py-3">
          <p className="text-xs text-[var(--color-text-muted)]">Yield</p>
          <p className="text-lg font-bold font-mono">{latestAttestation ? formatPercent(latestAttestation.yieldRateBps / 100) : "—"}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] px-4 py-3">
          <p className="text-xs text-[var(--color-text-muted)]">Attestations</p>
          <p className="text-lg font-bold font-mono">{attestations.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] px-4 py-3">
          <p className="text-xs text-[var(--color-text-muted)]">Whitelisted</p>
          <p className="text-lg font-bold font-mono">{wlEntries.length}</p>
        </div>
      </div>

      {/* Setup checklist */}
      {!setupComplete && (
        <div className="mb-8 rounded-xl bg-amber-50 border border-amber-200 px-5 py-4">
          <p className="text-sm font-semibold text-amber-900 mb-3">Setup Checklist</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${true ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"}`}>1</span>
              <span className="text-amber-800">Create asset</span>
              <span className="text-emerald-600 text-xs font-medium ml-auto">Done</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${hasAttestation ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"}`}>2</span>
              <span className="text-amber-800">Init attestation config</span>
              {hasAttestation ? (
                <span className="text-emerald-600 text-xs font-medium ml-auto">Done</span>
              ) : (
                <Link href={`/admin/assets/${id}/attestation-config`} className="text-blue-600 text-xs font-medium ml-auto underline">
                  Configure
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${hasWhitelist ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"}`}>3</span>
              <span className="text-amber-800">Add wallets to whitelist</span>
              {hasWhitelist ? (
                <span className="text-emerald-600 text-xs font-medium ml-auto">Done</span>
              ) : (
                <button onClick={() => setShowAddWl(true)} className="text-blue-600 text-xs font-medium ml-auto underline">
                  Add wallet
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Whitelist section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Whitelist ({wlEntries.length})</h2>
          <button
            onClick={() => setShowAddWl(true)}
            disabled={!connected}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-[var(--color-border)] hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            + Add Wallet
          </button>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
          {wlEntries.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-[var(--color-text-muted)]">No whitelisted wallets yet</p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              <div className="grid grid-cols-[2fr_1fr_0.5fr] gap-4 px-6 py-2.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase bg-[var(--color-surface-secondary)]">
                <span>Wallet</span>
                <span>Added</span>
                <span />
              </div>
              {wlEntries.map((entry) => (
                <div key={entry.wallet} className="grid grid-cols-[2fr_1fr_0.5fr] gap-4 px-6 py-3 items-center">
                  <span className="text-sm font-mono text-[var(--color-text)]">{shortenAddress(entry.wallet, 8)}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{new Date(entry.addedAt * 1000).toLocaleDateString()}</span>
                  <button
                    onClick={() => removeFromWl.mutate({ assetRegistryPubkey: assetPk, whitelistEntryPubkey: entry.pubkey })}
                    className="text-xs text-red-500 hover:text-red-700 font-medium text-right"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Redemptions */}
      {redemptions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Pending Redemptions ({redemptions.length})</h2>
          <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
            <div className="divide-y divide-[var(--color-border)]">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 px-6 py-2.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase bg-[var(--color-surface-secondary)]">
                <span>User</span>
                <span>Amount</span>
                <span>Requested</span>
                <span className="text-right">Actions</span>
              </div>
              {redemptions.map((r) => (
                <div key={r.pubkey} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 px-6 py-3 items-center">
                  <span className="text-sm font-mono text-[var(--color-text)]">{shortenAddress(r.user, 6)}</span>
                  <span className="text-sm font-mono">{(r.amount / 1e6).toFixed(2)}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{new Date(r.requestedAt * 1000).toLocaleString()}</span>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => fulfillRedemption.mutate({
                        rwaMint: asset.mint,
                        usdcMint: process.env.NEXT_PUBLIC_USDC_MINT ?? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                        userPubkey: r.user,
                        redemptionRequestPubkey: r.pubkey,
                      })}
                      disabled={fulfillRedemption.isPending}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40"
                    >
                      Fulfill
                    </button>
                    <button
                      onClick={() => rejectRedemption.mutate({
                        rwaMint: asset.mint,
                        userPubkey: r.user,
                        redemptionRequestPubkey: r.pubkey,
                      })}
                      disabled={rejectRedemption.isPending}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-40"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Attestation History */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">Attestation History</h2>
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
          {attestations.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-[var(--color-text-muted)]">No attestations published yet</p>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_0.8fr] gap-4 px-6 py-2.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase bg-[var(--color-surface-secondary)]">
                <span>NAV</span>
                <span>Yield</span>
                <span>Proof Hash</span>
                <span>Published</span>
                <span className="text-center">Status</span>
              </div>
              {attestations.map((att) => {
                const isFresh = att.validUntil > now;
                return (
                  <div key={att.pubkey} className="grid grid-cols-[1fr_1fr_1.5fr_1fr_0.8fr] gap-4 px-6 py-3 items-center">
                    <span className="text-sm font-mono">{(att.navBps / 10000).toFixed(4)}</span>
                    <span className="text-sm font-mono">{formatPercent(att.yieldRateBps / 100)}</span>
                    <span className="text-xs font-mono text-[var(--color-text-muted)] truncate">{att.proofHash}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">{new Date(att.publishedAt * 1000).toLocaleString()}</span>
                    <div className="flex justify-center">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        isFresh ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}>
                        {isFresh ? "valid" : "expired"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showAddWl && (
        <AddWhitelistModal assetPubkey={assetPk} onClose={() => setShowAddWl(false)} />
      )}
    </div>
  );
}
