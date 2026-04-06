"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useWhitelist, useAssets, useAddToWhitelist, useRemoveFromWhitelist } from "@/lib/solana/hooks";
import { useSelectedWalletAccount } from "@solana/react";
import { shortenAddress } from "@/lib/solana/format";

export default function WhitelistPage() {
  const { data: whitelist, isLoading } = useWhitelist();
  const { data: assets } = useAssets();
  const [account] = useSelectedWalletAccount(); const connected = !!account;
  const addToWl = useAddToWhitelist();
  const removeFromWl = useRemoveFromWhitelist();

  const [search, setSearch] = useState("");
  const [filterAsset, setFilterAsset] = useState("all");

  const [showAdd, setShowAdd] = useState(false);
  const [addWallet, setAddWallet] = useState("");
  const [addAsset, setAddAsset] = useState("");

  const list = whitelist ?? [];
  const assetList = assets ?? [];

  const filtered = list.filter((entry) => {
    const matchAsset = filterAsset === "all" || entry.assetPubkey === filterAsset;
    const matchSearch = entry.wallet.toLowerCase().includes(search.toLowerCase());
    return matchAsset && matchSearch;
  });

  async function handleAdd() {
    if (!addWallet.trim() || !addAsset) return;
    try {
      await addToWl.mutateAsync({
        assetRegistryPubkey: addAsset,
        walletAddress: addWallet.trim(),
      });
      setAddWallet("");
      setShowAdd(false);
    } catch (err) {
      console.error("Add to whitelist failed:", err);
    }
  }

  async function handleRemove(assetPubkey: string, whitelistEntryPubkey: string) {
    try {
      await removeFromWl.mutateAsync({
        assetRegistryPubkey: assetPubkey,
        whitelistEntryPubkey,
      });
    } catch (err) {
      console.error("Remove from whitelist failed:", err);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-[var(--color-text-muted)]">Loading whitelist...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Whitelist Management</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {list.length} wallets across {assetList.length} assets
          </p>
        </div>
        <button
          onClick={() => {
            setAddAsset(assetList[0]?.pubkey ?? "");
            setShowAdd(true);
          }}
          disabled={!connected}
          className="px-4 py-2.5 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--color-primary-light)] transition-colors disabled:opacity-40"
        >
          + Add Wallet
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={filterAsset}
          onChange={(e) => setFilterAsset(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
        >
          <option value="all">All Assets</option>
          {assetList.map((a) => (
            <option key={a.pubkey} value={a.pubkey}>{shortenAddress(a.mint, 6)}</option>
          ))}
        </select>
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search wallet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 pl-10 text-sm rounded-lg border border-[var(--color-border)] bg-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="grid grid-cols-[2fr_1.5fr_1fr_0.5fr] gap-4 px-6 py-2.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase bg-[var(--color-surface-secondary)] border-b border-[var(--color-border)]">
          <span>Wallet</span>
          <span>Asset</span>
          <span>Added</span>
          <span />
        </div>
        {filtered.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-[var(--color-text-muted)]">No entries found</p>
        ) : (
          filtered.map((entry) => (
            <div key={`${entry.assetPubkey}-${entry.wallet}`} className="grid grid-cols-[2fr_1.5fr_1fr_0.5fr] gap-4 px-6 py-3 items-center border-b border-[var(--color-border)] last:border-b-0">
              <span className="text-sm font-mono text-[var(--color-text)]">{shortenAddress(entry.wallet, 8)}</span>
              <span className="text-sm font-mono text-[var(--color-text-secondary)]">{shortenAddress(entry.assetPubkey, 6)}</span>
              <span className="text-xs text-[var(--color-text-muted)]">{new Date(entry.addedAt * 1000).toLocaleDateString()}</span>
              <button
                onClick={() => handleRemove(entry.assetPubkey, entry.pubkey)}
                disabled={removeFromWl.isPending}
                className="text-xs text-red-500 hover:text-red-700 font-medium text-right disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-xl">
            <div className="px-6 py-5 border-b border-[var(--color-border)]">
              <h3 className="text-lg font-bold text-[var(--color-text)]">Add to Whitelist</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Asset</label>
                <select
                  value={addAsset}
                  onChange={(e) => setAddAsset(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                >
                  {assetList.map((a) => (
                    <option key={a.pubkey} value={a.pubkey}>{shortenAddress(a.mint, 8)} ({a.assetType})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Wallet Address</label>
                <input
                  type="text"
                  value={addWallet}
                  onChange={(e) => setAddWallet(e.target.value)}
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
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-lg border border-[var(--color-border)] text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!addWallet.trim() || addToWl.isPending}
                className="flex-1 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary-light)] transition-colors disabled:opacity-40"
              >
                {addToWl.isPending ? "Signing..." : "Add Wallet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
