"use client";

import { useState } from "react";
import { useSelectedWalletAccount } from "@solana/react";
import { useWallets, useConnect } from "@wallet-standard/react";
import { StandardConnect } from "@wallet-standard/features";
import { MappedAsset, useMintRwaToken, useRedeemRwaToken, useTokenBalance } from "@/lib/solana/hooks";
import { shortenAddress } from "@/lib/solana/format";
import { logActivity } from "@/lib/api/client";

const USDC_MINT = process.env.NEXT_PUBLIC_USDC_MINT ?? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_DECIMALS = 6;

type Tab = "invest" | "redeem" | "pending";

interface InvestRedeemCardProps {
  asset: MappedAsset;
  navBps: number;
}

function WalletBtn({ wallet }: { wallet: Parameters<typeof useConnect>[0] }) {
  const [, setAccount] = useSelectedWalletAccount();
  const [isConnecting, connect] = useConnect(wallet);
  async function handleClick() {
    const accounts = await connect();
    if (accounts.length > 0) setAccount(accounts[0]);
  }
  return (
    <button
      onClick={handleClick}
      disabled={isConnecting}
      className="w-full flex items-center gap-3 px-4 py-2.5 border border-[var(--color-border)] hover:border-black transition-colors text-sm font-semibold disabled:opacity-50"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {wallet.icon && <img src={wallet.icon} alt="" className="w-5 h-5 rounded" />}
      <span>{isConnecting ? "Connecting..." : wallet.name}</span>
    </button>
  );
}

export function InvestRedeemCard({ asset, navBps }: InvestRedeemCardProps) {
  const [tab, setTab] = useState<Tab>("invest");
  const [payAmount, setPayAmount] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [account] = useSelectedWalletAccount();
  const connected = !!account;
  const allWallets = useWallets();
  const connectableWallets = allWallets
    .filter((w) => w.features.includes(StandardConnect))
    .filter((w, i, arr) => arr.findIndex((x) => x.name === w.name) === i);
  const mintRwa = useMintRwaToken();
  const redeemRwa = useRedeemRwaToken();
  const { data: usdcBalance } = useTokenBalance(USDC_MINT, account?.address);
  const { data: tokenBalance } = useTokenBalance(asset.mint, account?.address);

  const price = navBps / 10000;
  const receiveAmount = payAmount ? (parseFloat(payAmount) / price).toFixed(4) : "";
  const receiveUsd = payAmount ? `~$${parseFloat(payAmount).toFixed(2)}` : "~$0.00";
  const redeemUsdcAmount = redeemAmount ? (parseFloat(redeemAmount) * price).toFixed(4) : "0";

  const canInvest = connected && payAmount && parseFloat(payAmount) > 0 && !mintRwa.isPending;
  const canRedeem = connected && redeemAmount && parseFloat(redeemAmount) > 0 && !redeemRwa.isPending;

  async function handleInvest() {
    if (!canInvest) return;
    const usdcAmount = BigInt(Math.round(parseFloat(payAmount) * 10 ** USDC_DECIMALS));
    const result = await mintRwa.mutateAsync({ rwaMint: asset.mint, usdcMint: USDC_MINT, usdcAmount });
    setPayAmount("");
    logActivity({
      action: "mint",
      actor: account!.address,
      target: asset.mint,
      txSignature: typeof result === "string" ? result : undefined,
      details: { assetName: asset.name, usdcAmount: parseFloat(payAmount) },
    }).catch(() => {});
  }

  async function handleRedeem() {
    if (!canRedeem) return;
    const amount = BigInt(Math.round(parseFloat(redeemAmount) * 10 ** USDC_DECIMALS));
    const result = await redeemRwa.mutateAsync({ rwaMint: asset.mint, amount });
    setRedeemAmount("");
    logActivity({
      action: "redeem",
      actor: account!.address,
      target: asset.mint,
      txSignature: typeof result === "string" ? result : undefined,
      details: { assetName: asset.name, tokenAmount: parseFloat(redeemAmount) },
    }).catch(() => {});
  }

  const error = mintRwa.error || redeemRwa.error;

  return (
    <div className="bg-white border border-[var(--color-border)] w-full max-w-md">
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
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  You pay
                </label>
                {connected && usdcBalance !== undefined && (
                  <button
                    type="button"
                    onClick={() => setPayAmount(usdcBalance.toFixed(2))}
                    className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                  >
                    Balance: <span className="font-mono">{usdcBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </button>
                )}
              </div>
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  You receive
                </label>
                {connected && tokenBalance !== undefined && (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Balance: <span className="font-mono">{tokenBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                  </span>
                )}
              </div>
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

            {!connected ? (
              <div className="space-y-2">
                {connectableWallets.length > 0 ? (
                  connectableWallets.map((w) => <WalletBtn key={w.name} wallet={w} />)
                ) : (
                  <a
                    href="https://phantom.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3.5 text-white text-sm font-extrabold uppercase tracking-widest transition-colors"
                    style={{ background: "var(--color-dark)" }}
                  >
                    Install Phantom Wallet
                  </a>
                )}
              </div>
            ) : (
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
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  You redeem
                </label>
                {connected && tokenBalance !== undefined && (
                  <button
                    type="button"
                    onClick={() => setRedeemAmount(tokenBalance.toFixed(4))}
                    className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                  >
                    Balance: <span className="font-mono">{tokenBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                  </button>
                )}
              </div>
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  You receive
                </label>
                {connected && usdcBalance !== undefined && (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Balance: <span className="font-mono">{usdcBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </span>
                )}
              </div>
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
              <div className="space-y-2">
                {connectableWallets.length > 0 ? (
                  connectableWallets.map((w) => <WalletBtn key={w.name} wallet={w} />)
                ) : (
                  <a
                    href="https://phantom.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3.5 text-white text-sm font-extrabold uppercase tracking-widest transition-colors"
                    style={{ background: "var(--color-dark)" }}
                  >
                    Install Phantom Wallet
                  </a>
                )}
              </div>
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
