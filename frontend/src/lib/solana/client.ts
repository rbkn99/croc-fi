const CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? `https://api.${CLUSTER}.solana.com`;

export function getCluster(): string {
  return CLUSTER;
}

export function getRpcUrl(): string {
  return RPC_URL;
}

export function getSolanaChain(): `solana:${string}` {
  return `solana:${CLUSTER}` as `solana:${string}`;
}
