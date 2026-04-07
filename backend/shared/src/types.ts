import { PublicKey } from "@solana/web3.js";

export enum AssetType {
  Treasury = "Treasury",
  CorporateBond = "CorporateBond",
  MoneyMarket = "MoneyMarket",
  Commodity = "Commodity",
}

export enum AssetStatus {
  Active = "Active",
  Paused = "Paused",
  Redeemed = "Redeemed",
}

export interface AssetRegistry {
  issuer: PublicKey;
  attestor: PublicKey;
  assetType: AssetType;
  status: AssetStatus;
  createdAt: number;
}

export interface AttestationRecord {
  asset: PublicKey;
  navBps: number;
  yieldRateBps: number;
  proofHash: Uint8Array;
  validUntil: number;
  attestorSig: Uint8Array;
  publishedAt: number;
}

export interface WhitelistEntry {
  asset: PublicKey;
  wallet: PublicKey;
  addedAt: number;
}

export interface PublishAttestationParams {
  asset: PublicKey;
  navBps: number;
  yieldRateBps: number;
  proofHash: Buffer;
  validityWindowSeconds: number;
}

export interface CreateAssetParams {
  assetType: AssetType;
  attestor: PublicKey;
}

export interface MintParams {
  asset: PublicKey;
  usdcAmount: number;
}

export interface RedeemParams {
  asset: PublicKey;
  tokenAmount: number;
}

// --- KYC / Compliance ---

export enum KycStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
  Expired = "expired",
}

export enum InvestorTier {
  Retail = "retail",
  Accredited = "accredited",
  QualifiedPurchaser = "qualified_purchaser",
  Institutional = "institutional",
}

export interface KycRecord {
  wallet: string;
  externalId: string;
  provider: string;
  status: KycStatus;
  tier: InvestorTier;
  jurisdiction: string;
  verifiedAt: number | null;
  expiresAt: number | null;
  rejectionReason: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface KycWebhookPayload {
  externalUserId: string;
  reviewStatus: "completed" | "pending" | "rejected";
  reviewResult?: {
    reviewAnswer: "GREEN" | "RED" | "YELLOW";
    rejectLabels?: string[];
  };
  applicantId: string;
  type: string;
  createdAt: string;
}

export interface PolicyConfig {
  assetId: string;
  requiredTier: InvestorTier;
  allowedJurisdictions: string[];
  blockedJurisdictions: string[];
  requireFreshAttestation: boolean;
  maxAttestationAgeSec: number;
}

// --- Asset Metadata (off-chain, issuer-provided) ---

export interface CounterpartyInfo {
  role: "custodian" | "nav_agent" | "auditor" | "legal_counsel" | "fund_admin" | "transfer_agent" | "other";
  name: string;
  jurisdiction?: string;
  url?: string;
  description?: string;
}

export interface LegalStructure {
  vehicleType: string;
  entityName: string;
  jurisdiction: string;
  regulator?: string;
  registrationNumber?: string;
  inceptionDate?: string;
  investorRestrictions: string[];
  taxTreatment?: string;
}

export interface AssetDocument {
  title: string;
  type: "prospectus" | "fact_sheet" | "audit_report" | "legal_opinion" | "subscription_agreement" | "tax_memo" | "other";
  url: string;
  publishedAt?: string;
  hash?: string;
}

export interface UnderlyingAssetInfo {
  description: string;
  benchmark?: string;
  maturityRange?: string;
  creditRating?: string;
  averageDuration?: string;
  concentrationLimit?: string;
}

export interface AssetMetadata {
  assetId: string;
  name: string;
  ticker: string;
  assetType: AssetType;
  description: string;
  legalStructure: LegalStructure;
  underlying: UnderlyingAssetInfo;
  counterparties: CounterpartyInfo[];
  documents: AssetDocument[];
  fees: {
    managementFeeBps: number;
    performanceFeeBps: number;
    mintFeeBps: number;
    redeemFeeBps: number;
  };
  imageUrl?: string;
  mintPubkey?: string;
  issuerPubkey?: string;
  attestorPubkey?: string;
  links: {
    website?: string;
    explorer?: string;
    github?: string;
  };
  updatedAt: number;
}

// --- Activity / Audit ---

export interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  target: string;
  details: Record<string, unknown>;
  timestamp: number;
  txSignature?: string;
}
