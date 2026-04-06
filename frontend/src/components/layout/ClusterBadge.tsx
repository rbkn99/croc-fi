"use client";

import { getCluster } from "@/lib/solana/client";

export function ClusterBadge() {
  const cluster = getCluster();

  if (cluster === "mainnet-beta") return null;

  const colors: Record<string, string> = {
    devnet: "bg-amber-100 text-amber-800",
    testnet: "bg-blue-100 text-blue-800",
  };

  return (
    <span
      className={`px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest ${colors[cluster] ?? "bg-[var(--color-surface)] text-[var(--color-text-muted)]"}`}
    >
      {cluster}
    </span>
  );
}
