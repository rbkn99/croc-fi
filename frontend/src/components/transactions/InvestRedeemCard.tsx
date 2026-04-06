"use client";

import { useState } from "react";
import { useSelectedWalletAccount } from "@solana/react";
import { MappedAsset, useMintRwaToken, useRedeemRwaToken } from "@/lib/solana/hooks";
import { shortenAddress } from "@/lib/solana/format";
import { useKycStatus, useStartKyc } from "@/lib/api/hooks";

const USDC_MINT = process.env.NEXT_PUBLIC_USDC_MINT ?? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_DECIMALS = 6;

type Tab = "invest" | "redeem" | "pending";

interface InvestRedeemCardProps {
  asset: MappedAsset;
  navBps: number;
}

function KycBanner() {
  const { data: kyc, isLoading } = useKycStatus();
  const startKyc = useStartKyc();
  const [account] = useSelectedWalletAccount();
  const connected = !!account;

  if (!connected || isLoading) return null;

  if (kyc?.status === "approved") {
    return (
      <div className="border px-3 py-2 text-xs flex items-center gap-2"
        style={{ borderColor: "var(--color-success)", color: "var(--color-success)", background: "rgba(26,122,60,0.06)" }}>
        <span className="w-2 h-2 rounded-full" style={{ background: "var(--color-success)" }} />
        KYC verified · {kyc.tier}
      </div>
    );
  }

  if (kyc?.status === "pending") {
    return (
      <div className="border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        KYC verification in progress...
      </div>
    );
  }

  if (kyc?.status === "rejected") {
    return (
      <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
        KYC rejected. Please contact support.
      </div>
    );
  }

  if (kyc?.status === "expired") {
    return (
      <div className="border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        KYC expired. Please re-verify.
        <button onClick={() => startKyc.mutate()} className="ml-2 underline font-medium">
          Re-verify
        </button>
      </div>
    );
  }

  return null;
}

export function InvestRedeemCard({ asset, navBps }: InvestRedeemCardProps) {
  const [tab, setTab] = useState<Tab>("invest");
  const [payAmount, setPayAmount] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [account, setAccount, wallets] = useSelectedWalletAccount();
  const connected = !!account;
  const { data: kyc } = useKycStatus();
  const startKyc = useStartKyc();
  const mintRwa = useMintRwaToken();
  const redeemRwa = useRedeemRwaToken();

  const price = navBps / 10000;
  const receiveAmount = payAmount ? (parseFloat(payAmount) / price).toFixed(4) : "";
  const receiveUsd = payAmount ? `~$${parseFloat(payAmount).toFixed(2)}` : "~$0.00";
  const redeemUsdcAmount = redeemAmount ? (parseFloat(redeemAmount) * price).toFixed(4) : "0";

  const canInvest = connected && kyc?.status === "approved" && payAmount && parseFloat(payAmount) > 0 && !mintRwa.isPending;
  const canRedeem = connected && kyc?.status === "approved" && redeemAmount && parseFloat(redeemAmount) > 0 && !redeemRwa.isPending;

  async function handleInvest() {
    if (!canInvest) return;
    const usdcAmount = BigInt(Math.round(parseFloat(payAmount) * 10 ** USDC_DECIMALS));
    await mintRwa.mutateAsync({ rwaMint: asset.mint, usdcMint: USDC_MINT, usdcAmount });
    setPayAmount("");
  }

  async function handleRedeem() {
    if (!canRedeem) return;
    const amount = BigInt(Math.round(parseFloat(redeemAmount) * 10 ** USDC_DECIMALS));
    await redeemRwa.mutateAsync({ rwaMint: asset.mint, amount });
    setRedeemAmount("");
  }

  function handleGetAccess() {
    if (!connected) {
      const firstAccount = wallets.flatMap((w) => w.accounts)[0];
      if (firstAccount) setAccount(firstAccount);
      return;
    }
    startKyc.mutate(undefined, {
      onSuccess: (data: { verificationUrl?: string }) => {
        if (data.verificationUrl) window.open(data.verificationUrl, "_blank");
      },
    });
  }

  function handleConnect() {
    const firstAccount = wallets.flatMap((w) => w.accounts)[0];
    if (firstAccount) setAccount(firstAccount);
  }

  const error = mintRwa.error || redeemRwa.error;

  return (
    <div className="bg-white border border-[var(--color-border)] w-full max-w-md">
      {/* Network selector */}
      <div className="px-6 pt-5 pb-3">
        <button className="inline-flex items-center gap-2 px-3 py-1.5 border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
          <span className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500" />
          <span className="font-bold uppercase tracking-wide text-xs">Solana</span>
          <svg className="w-3 h-3 ml-0.5" fill="none" viewBox="0 0 16 16" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6l4 4 4-4" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="px-6">
        <div className="flex border-b border-[var(--color-border)]">
          {(["invest", "redeem", "pending"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                tab === t
                  ? "text-[var(--color-text)] border-b-2"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              }`}
              style={tab === t ? { borderColor: "var(--color-accent)" } : {}}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-5">
        {tab === "invest" && (
          <div className="space-y-4">
            <KycBanner />

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5 block">
                You pay
              </label>
              <div className="flex items-center justify-between border border-[var(--color-border)] px-4 py-3 focus-within:border-[var(--color-accent)] transition-colors bg-[var(--color-surface)]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">$</div>
                  <span className="font-bold text-sm uppercase tracking-wide">USDC</span>
                </div>
                <div className="text-right">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-24 text-right text-lg font-mono font-semibold bg-transparent outline-none text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <p className="text-xs text-[var(--color-text-muted)]">~${payAmount || "0.00"}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-8 h-8 border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] bg-[var(--color-surface)]">↓</div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5 block">
                You receive
              </label>
              <div className="flex items-center justify-between border border-[var(--color-border)] px-4 py-3 bg-[var(--color-surface)]">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: "var(--color-accent)" }}
                  >
                    {asset.assetType.charAt(0)}
                  </div>
                  <span className="font-bold text-sm uppercase tracking-wide">{shortenAddress(asset.mint, 4)}</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-mono font-semibold text-[var(--color-text)]">{receiveAmount || "0"}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{receiveUsd}</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {(error as Error).message}
              </div>
            )}

            {!connected && (
              <>
                <button
                  onClick={handleConnect}
                  className="w-full py-3.5 text-white text-sm font-extrabold uppercase tracking-widest transition-colors"
                  style={{ background: "var(--color-dark)" }}
                >
                  Connect Wallet
                </button>
                <button
                  onClick={handleGetAccess}
                  className="w-full py-3 text-sm font-bold uppercase tracking-widest border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
                >
                  Get Access
                </button>
              </>
            )}

            {connected && kyc?.status !== "approved" && (
              <button
                onClick={handleGetAccess}
                disabled={startKyc.isPending || kyc?.status === "pending"}
                className="w-full py-3.5 text-white text-sm font-extrabold uppercase tracking-widest transition-colors disabled:opacity-40"
                style={{ background: "var(--color-accent)" }}
              >
                {startKyc.isPending
                  ? "Starting KYC..."
                  : kyc?.status === "pending"
                    ? "Verification in progress..."
                    : "Complete KYC to Invest"}
              </button>
            )}

            {connected && kyc?.status === "approved" && (
              <button
                onClick={handleInvest}
                disabled={!canInvest}
                className="w-full py-3.5 text-white text-sm font-extrabold uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "var(--color-accent)" }}
              >
                {mintRwa.isPending ? "Signing Transaction..." : "Invest"}
              </button>
            )}
          </div>
        )}

        {tab === "redeem" && (
          <div className="space-y-4">
            <KycBanner />

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5 block">
                You redeem
              </label>
              <div className="flex items-center justify-between border border-[var(--color-border)] px-4 py-3 bg-[var(--color-surface)]">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: "var(--color-accent)" }}
                  >
                    {asset.assetType.charAt(0)}
                  </div>
                  <span className="font-bold text-sm uppercase tracking-wide">{shortenAddress(asset.mint, 4)}</span>
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  className="w-24 text-right text-lg font-mono font-semibold bg-transparent outline-none text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-8 h-8 border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] bg-[var(--color-surface)]">↓</div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5 block">
                You receive
              </label>
              <div className="flex items-center justify-between border border-[var(--color-border)] px-4 py-3 bg-[var(--color-surface)]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">$</div>
                  <span className="font-bold text-sm uppercase tracking-wide">USDC</span>
                </div>
                <p className="text-lg font-mono font-semibold text-[var(--color-text)]">{redeemUsdcAmount}</p>
              </div>
            </div>

            <p className="text-xs text-[var(--color-text-muted)] text-center uppercase tracking-wide">
              Redemption requests are settled T+1 via custodian
            </p>

            {error && (
              <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {(error as Error).message}
              </div>
            )}

            {connected ? (
              <button
                onClick={handleRedeem}
                disabled={!canRedeem}
                className="w-full py-3.5 text-white text-sm font-extrabold uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "var(--color-accent)" }}
              >
                {redeemRwa.isPending ? "Signing Transaction..." : "Redeem"}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                className="w-full py-3.5 text-white text-sm font-extrabold uppercase tracking-widest transition-colors"
                style={{ background: "var(--color-dark)" }}
              >
                Connect Wallet
              </button>
            )}
          </div>
        )}

        {tab === "pending" && (
          <div className="py-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">No pending redemptions</p>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-[var(--color-border)]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-[var(--color-text-secondary)]">
            1 token = ${price.toFixed(4)} USD
          </span>
        </div>
      </div>
    </div>
  );
}
