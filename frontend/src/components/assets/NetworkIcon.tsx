interface NetworkIconProps {
  network: string;
  size?: number;
}

const NETWORK_COLORS: Record<string, string> = {
  solana: "bg-gradient-to-br from-purple-500 to-fuchsia-500",
  ethereum: "bg-blue-500",
  arbitrum: "bg-blue-600",
  base: "bg-blue-400",
};

const NETWORK_LABELS: Record<string, string> = {
  solana: "S",
  ethereum: "E",
  arbitrum: "A",
  base: "B",
};

export function NetworkIcon({ network, size = 24 }: NetworkIconProps) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full text-white font-bold ${NETWORK_COLORS[network] ?? "bg-gray-400"}`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      title={network}
    >
      {NETWORK_LABELS[network] ?? "?"}
    </div>
  );
}
