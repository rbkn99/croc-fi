import { Cluster } from "@solana/web3.js";

export interface KycProviderConfig {
  provider: "sumsub" | "synaps" | "manual";
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
  baseUrl: string;
  kycExpiryDays: number;
}

export interface AppConfig {
  cluster: Cluster;
  rpcUrl: string;
  attestorKeyPath: string;
  issuerKeyPath: string;
  treasuryDirectApiUrl: string;
  pythSofrFeedId: string;
  attestationIntervalMs: number;
  apiPort: number;
  kyc: KycProviderConfig;
  kycExpiryCheckIntervalMs: number;
}

const VALID_CLUSTERS = new Set(["devnet", "testnet", "mainnet-beta"]);
const VALID_KYC_PROVIDERS = new Set(["sumsub", "synaps", "manual"]);

export function loadConfig(): AppConfig {
  const cluster = process.env.SOLANA_CLUSTER || "devnet";
  if (!VALID_CLUSTERS.has(cluster)) {
    throw new Error(`Invalid SOLANA_CLUSTER: "${cluster}". Must be devnet, testnet, or mainnet-beta`);
  }

  const kycProvider = process.env.KYC_PROVIDER || "manual";
  if (!VALID_KYC_PROVIDERS.has(kycProvider)) {
    throw new Error(`Invalid KYC_PROVIDER: "${kycProvider}". Must be sumsub, synaps, or manual`);
  }

  const apiPort = Number(process.env.API_PORT) || 3000;
  if (isNaN(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error(`Invalid API_PORT: "${process.env.API_PORT}"`);
  }

  // Warn about missing secrets in non-manual mode
  if (kycProvider !== "manual") {
    if (!process.env.KYC_WEBHOOK_SECRET) {
      console.warn("[Config] KYC_WEBHOOK_SECRET not set — webhook verification will fail");
    }
    if (!process.env.KYC_API_KEY) {
      console.warn("[Config] KYC_API_KEY not set — KYC provider calls will fail");
    }
  }

  if (!process.env.DATABASE_URL) {
    console.warn("[Config] DATABASE_URL not set — database operations will fail");
  }

  return {
    cluster: cluster as Cluster,
    rpcUrl:
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
    attestorKeyPath:
      process.env.ATTESTOR_KEY_PATH || "~/.config/solana/attestor.json",
    issuerKeyPath:
      process.env.ISSUER_KEY_PATH || "~/.config/solana/issuer.json",
    treasuryDirectApiUrl:
      process.env.TREASURY_DIRECT_API_URL ||
      "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates",
    pythSofrFeedId:
      process.env.PYTH_SOFR_FEED_ID ||
      "0x734ba2bc1cea4652b0e23f899cc39b3e61f39bfd0f13cc6ef48e718bde57e60e",
    attestationIntervalMs:
      Number(process.env.ATTESTATION_INTERVAL_MS) || 24 * 60 * 60 * 1000,
    apiPort,
    kyc: {
      provider: kycProvider as "sumsub" | "synaps" | "manual",
      apiKey: process.env.KYC_API_KEY || "",
      apiSecret: process.env.KYC_API_SECRET || "",
      webhookSecret: process.env.KYC_WEBHOOK_SECRET || "",
      baseUrl: process.env.KYC_BASE_URL || "https://api.sumsub.com",
      kycExpiryDays: Number(process.env.KYC_EXPIRY_DAYS) || 365,
    },
    kycExpiryCheckIntervalMs:
      Number(process.env.KYC_EXPIRY_CHECK_INTERVAL_MS) || 6 * 60 * 60 * 1000,
  };
}
