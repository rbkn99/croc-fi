"use client";

import { useState, useRef, useEffect } from "react";
import { useSelectedWalletAccount } from "@solana/react";
import { useWallets, useConnect } from "@wallet-standard/react";
import { StandardConnect } from "@wallet-standard/features";
import { shortenAddress } from "@/lib/solana/format";
import type { UiWallet } from "@wallet-standard/ui";

function ConnectWalletItem({
  wallet,
  onConnect,
}: {
  wallet: UiWallet;
  onConnect: () => void;
}) {
  const [, setAccount] = useSelectedWalletAccount();
  const [isConnecting, connect] = useConnect(wallet);

  async function handleClick() {
    const accounts = await connect();
    if (accounts.length > 0) {
      setAccount(accounts[0]);
      onConnect();
    }
  }

  return (
    <button
      disabled={isConnecting}
      onClick={handleClick}
      className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {wallet.icon && (
        <img src={wallet.icon} alt="" className="w-5 h-5 rounded" />
      )}
      <span className="font-semibold">
        {isConnecting ? "Connecting..." : wallet.name}
      </span>
    </button>
  );
}

export function ConnectButton() {
  const [account, setAccount] = useSelectedWalletAccount();
  const allWallets = useWallets();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const connectableWallets = allWallets
    .filter((w) => w.features.includes(StandardConnect))
    .filter((w, i, arr) => arr.findIndex((x) => x.name === w.name) === i);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (account) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-xs font-mono text-[var(--color-text-secondary)]">
          {shortenAddress(account.address)}
        </span>
        <button
          onClick={() => setAccount(undefined)}
          className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (connectableWallets.length === 0) {
    return (
      <span className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-[var(--color-surface)] text-[var(--color-text-muted)] cursor-not-allowed border border-[var(--color-border)]">
        No Wallet Found
      </span>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-white transition-colors"
        style={{ background: "var(--color-dark)" }}
      >
        Connect Wallet
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 border border-[var(--color-border)] bg-white shadow-lg py-1 z-50">
          {connectableWallets.map((wallet) => (
            <ConnectWalletItem
              key={wallet.name}
              wallet={wallet}
              onConnect={() => setOpen(false)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
