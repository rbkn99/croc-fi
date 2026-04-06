"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSelectedWalletAccount } from "@solana/react";
import { useCreateAsset } from "@/lib/solana/hooks";
import type { AssetType } from "@/lib/api/types";

const ASSET_TYPES: { value: AssetType; label: string; description: string }[] = [
  { value: "Treasury", label: "Treasury", description: "US Treasury bills, notes, bonds" },
  { value: "CorporateBond", label: "Corporate Bond", description: "Investment-grade corporate debt" },
  { value: "MoneyMarket", label: "Money Market", description: "Short-term lending and yield strategies" },
  { value: "Commodity", label: "Commodity", description: "Tokenized physical commodities" },
];

export default function CreateAssetPage() {
  const router = useRouter();
  const [account] = useSelectedWalletAccount();
  const connected = !!account;
  const createAsset = useCreateAsset();

  const [assetType, setAssetType] = useState<AssetType>("Treasury");
  const [minMintAmount, setMinMintAmount] = useState("");
  const [minRedeemAmount, setMinRedeemAmount] = useState("");
  const [dailyMintLimit, setDailyMintLimit] = useState("");
  const [dailyRedeemLimit, setDailyRedeemLimit] = useState("");

  const canSubmit = connected && !createAsset.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      await createAsset.mutateAsync({
        assetType,
        minMintAmount: minMintAmount ? Number(minMintAmount) : 0,
        minRedeemAmount: minRedeemAmount ? Number(minRedeemAmount) : 0,
        dailyMintLimit: dailyMintLimit ? Number(dailyMintLimit) : 0,
        dailyRedeemLimit: dailyRedeemLimit ? Number(dailyRedeemLimit) : 0,
      });
      router.push("/admin");
    } catch (err) {
      console.error("Create asset failed:", err);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">Create New Asset</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-8">
        Creates a Token-2022 mint with TransferHook + InterestBearingMint extensions and registers it in the ProofLayer registry. Your wallet becomes the issuer authority.
      </p>

      {!connected && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 mb-6">
          Connect your wallet to create an asset.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Asset Type */}
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-3">
            Asset Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {ASSET_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setAssetType(t.value)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  assetType === t.value
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-2 ring-[var(--color-primary)]/20"
                    : "border-[var(--color-border)] bg-white hover:border-gray-300"
                }`}
              >
                <p className="text-sm font-semibold text-[var(--color-text)]">{t.label}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Limits */}
        <div>
          <label className="block text-sm font-semibold text-[var(--color-text)] mb-3">
            Limits (optional, 0 = no limit)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="minMint" className="block text-xs text-[var(--color-text-muted)] mb-1">
                Min Mint (USDC)
              </label>
              <input
                id="minMint"
                type="number"
                value={minMintAmount}
                onChange={(e) => setMinMintAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm font-mono text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>
            <div>
              <label htmlFor="minRedeem" className="block text-xs text-[var(--color-text-muted)] mb-1">
                Min Redeem (RWA)
              </label>
              <input
                id="minRedeem"
                type="number"
                value={minRedeemAmount}
                onChange={(e) => setMinRedeemAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm font-mono text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>
            <div>
              <label htmlFor="dailyMint" className="block text-xs text-[var(--color-text-muted)] mb-1">
                Daily Mint Limit (USDC)
              </label>
              <input
                id="dailyMint"
                type="number"
                value={dailyMintLimit}
                onChange={(e) => setDailyMintLimit(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm font-mono text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>
            <div>
              <label htmlFor="dailyRedeem" className="block text-xs text-[var(--color-text-muted)] mb-1">
                Daily Redeem Limit (RWA)
              </label>
              <input
                id="dailyRedeem"
                type="number"
                value={dailyRedeemLimit}
                onChange={(e) => setDailyRedeemLimit(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm font-mono text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>
          </div>
        </div>

        {/* Info box */}
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          <p className="font-semibold mb-1">What happens</p>
          <ul className="list-disc list-inside text-xs space-y-0.5 text-blue-700">
            <li>Token-2022 mint is created with TransferHook + InterestBearingMint extensions</li>
            <li>Asset is registered in the ProofLayer on-chain registry</li>
            <li>Your wallet is set as the issuer authority</li>
            <li>Configure attestation and whitelist from the asset detail page</li>
          </ul>
        </div>

        {createAsset.error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {(createAsset.error as Error).message}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-sm hover:bg-[var(--color-primary-light)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {createAsset.isPending ? "Creating Mint & Asset..." : "Create Asset"}
        </button>
      </form>
    </div>
  );
}
