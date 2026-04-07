export type AssetType = "Treasury" | "CorporateBond" | "MoneyMarket" | "Commodity";
export type AssetStatus = "active" | "paused" | "redeemed";

export interface Product {
  id: string;
  name: string;
  ticker: string;
  assetType: string;
  subtitle?: string;
  icon?: string;
  strategyManager?: string;
  strategyManagerIcon?: string;
  tvl: number;
  apy?: number;
  apy7d: number;
  apy30d: number;
  price: number;
  priceChange24h?: number;
  networks?: string[];
  integrations?: string[];
  description: string;
  attestationFresh?: boolean;
  attestationValidUntil?: number;
  status: AssetStatus | string;
  isFresh?: boolean | null;
  navBps?: number;
  yieldRateBps?: number;
  mintFeeBps?: number;
  redeemFeeBps?: number;
  managementFeeBps?: number;
  onChainPubkey?: string | null;
  mintPubkey?: string | null;
  imageUrl?: string | null;
}

export interface AssetHealth {
  isActive: boolean;
  isAttestationFresh: boolean;
  navBps: number;
  yieldRateBps: number;
}

export interface WhitelistStatus {
  isWhitelisted: boolean;
}

export interface ManagedAsset {
  id: string;
  pubkey: string;
  mintPubkey: string;
  name: string;
  ticker: string;
  assetType: AssetType;
  status: AssetStatus;
  attestorPubkey: string;
  issuerPubkey: string;
  description: string;
  createdAt: number;
  tvl: number;
  currentNavBps: number;
  currentYieldBps: number;
  totalMinted: number;
  totalRedeemed: number;
  whitelistCount: number;
}

export interface Attestation {
  id: string;
  assetId: string;
  assetName: string;
  navBps: number;
  yieldRateBps: number;
  proofHash: string;
  validUntil: number;
  publishedAt: number;
  txSignature: string;
  status: "published" | "expired" | "superseded";
}

export interface OnChainAttestation {
  navBps: number;
  yieldRateBps: number;
  proofHash: string;
  validUntil: number;
  publishedAt: number;
  isFresh: boolean;
}

export interface KycStatusResponse {
  status: string;
  tier: string;
  rejectionReason?: string;
}

export interface WhitelistEntry {
  wallet: string;
  assetId: string;
  addedAt: number;
  addedBy: string;
  label?: string;
}

export interface ActivityEvent {
  id: string;
  type: "asset_created" | "attestation_published" | "asset_paused" | "asset_unpaused" | "whitelist_added" | "whitelist_removed" | "mint" | "redeem";
  assetId: string;
  assetName: string;
  description: string;
  timestamp: number;
  txSignature?: string;
}

// --- Asset Transparency / Detail ---

export interface CounterpartyInfo {
  role: string;
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
  type: string;
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

export interface AssetPolicy {
  assetId: string;
  name: string;
  transferHookEnforced: boolean;
  requireKyc: boolean;
  requiredTier: string;
  investorRestrictions: string[];
  attestationRequirement: {
    requireFresh: boolean;
    maxAgeSec: number;
    source: string;
  };
  whitelistModel: string;
  complianceChecks: string[];
  onChainEnforcement: {
    program: string;
    checks: string[];
  };
}

