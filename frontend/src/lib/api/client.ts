import type {
  Product,
  AssetHealth,
  WhitelistStatus,
  AssetMetadata,
  AssetPolicy,
  AssetDocument,
  OnChainAttestation,
  KycStatusResponse,
} from "./types";
import { getAuthToken } from "@/lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// --- Products ---

export async function fetchProducts(): Promise<Product[]> {
  const data = await get<{ products: Product[] }>("/products");
  return data.products;
}

export async function fetchProduct(id: string): Promise<Product> {
  return get<Product>(`/products/${id}`);
}

export interface ProductAttestation {
  assetId: string;
  name: string;
  ticker: string;
  navBps: number;
  yieldRateBps: number;
  proofHash: string;
  validUntil: number;
  publishedAt: number;
  isFresh: boolean;
}

export async function fetchProductAttestations(): Promise<ProductAttestation[]> {
  const data = await get<{ attestations: ProductAttestation[] }>("/products/attestations");
  return data.attestations;
}

// --- Health ---

export async function fetchHealth(): Promise<{ status: string }> {
  return get("/health");
}

// --- On-chain asset reads (proxied through backend) ---

export async function fetchAssetHealth(pubkey: string): Promise<AssetHealth> {
  return get<AssetHealth>(`/assets/${pubkey}/health`);
}

export async function fetchAssetAttestation(pubkey: string): Promise<OnChainAttestation> {
  return get<OnChainAttestation>(`/assets/${pubkey}/attestation`);
}

export async function fetchWhitelistStatus(
  assetPubkey: string,
  walletPubkey: string
): Promise<WhitelistStatus> {
  return get<WhitelistStatus>(`/assets/${assetPubkey}/whitelist/${walletPubkey}`);
}

// --- Asset Metadata & Policy ---

export async function fetchAssetMeta(assetId: string): Promise<AssetMetadata> {
  return get<AssetMetadata>(`/assets/meta/${assetId}`);
}

export async function fetchAssetPolicy(assetId: string): Promise<AssetPolicy> {
  return get<AssetPolicy>(`/assets/meta/${assetId}/policy`);
}

// --- File Upload ---

export interface UploadResult {
  url: string;
  filename: string;
  originalName: string;
  hash: string;
  size: number;
  mimetype: string;
}

export async function uploadDocument(file: File): Promise<UploadResult> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`${API_BASE}/api/v1/uploads/documents`, {
    method: "POST",
    headers: authHeaders(), // no Content-Type — browser sets multipart boundary automatically
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Upload failed: ${res.status}` }));
    throw new Error((err as { error: string }).error ?? `Upload failed: ${res.status}`);
  }
  return res.json() as Promise<UploadResult>;
}

// --- Documents ---

export async function addAssetDocument(
  assetId: string,
  doc: Omit<AssetDocument, "hash"> & { hash?: string }
): Promise<{ documents: AssetDocument[] }> {
  return post(`/assets/meta/${assetId}/documents`, doc);
}

export async function removeAssetDocument(
  assetId: string,
  index: number
): Promise<{ documents: AssetDocument[] }> {
  return del(`/assets/meta/${assetId}/documents/${index}`);
}

// --- Asset Registration (save issuer application to DB) ---

export interface RegisterAssetParams {
  mintPubkey: string;
  issuerWallet: string;
  institutionName: string;
  contactName: string;
  email: string;
  jurisdiction?: string;
  assetType: string;
  aumEstimate?: string;
  description?: string;
  logoUrl?: string;
  minMintAmount?: number;
  minRedeemAmount?: number;
  dailyMintLimit?: number;
  dailyRedeemLimit?: number;
}

export async function registerAsset(params: RegisterAssetParams): Promise<{ status: string; id: string }> {
  return post("/assets/register", params);
}

// --- Asset Metadata (upsert) ---

export async function saveAssetMeta(
  assetId: string,
  metadata: Partial<AssetMetadata>
): Promise<AssetMetadata> {
  return post<AssetMetadata>(`/assets/meta/${assetId}`, metadata);
}

// --- KYC ---

export async function fetchKycStatus(wallet: string): Promise<KycStatusResponse> {
  return get<KycStatusResponse>(`/kyc/status/${wallet}`);
}

export interface KycStartResponse {
  status: string;
  applicantId?: string;
  verificationUrl?: string;
  tier?: string;
  expiresAt?: number | null;
}

export async function startKyc(wallet: string): Promise<KycStartResponse> {
  return post<KycStartResponse>("/kyc/start", { wallet });
}

export async function fetchKycSummary(): Promise<unknown> {
  return get("/issuer/kyc-summary");
}

export async function fetchKycList(): Promise<unknown> {
  return get("/kyc/list");
}

// --- Issuer / Admin ---

export async function issuerAddToWhitelist(
  assetPubkey: string,
  wallet: string
): Promise<unknown> {
  return post("/issuer/whitelist/add", { assetPubkey, wallet });
}

export async function issuerRemoveFromWhitelist(
  assetPubkey: string,
  wallet: string
): Promise<unknown> {
  return post("/issuer/whitelist/remove", { assetPubkey, wallet });
}

export async function issuerSyncWhitelist(assetPubkey: string): Promise<unknown> {
  return post("/issuer/whitelist/sync", { assetPubkey });
}

export async function fetchIssuerApplications(): Promise<unknown> {
  return get("/issuer/applications");
}

// --- Stats ---

export interface StatsResponse {
  totalProducts: number;
  totalTvl: number;
  avgYieldBps: number;
  lastUpdated: number;
}

export async function fetchStats(): Promise<StatsResponse> {
  return get<StatsResponse>("/stats");
}

// --- Portfolio ---

export interface PortfolioHolding {
  assetId: string;
  name: string;
  ticker: string;
  assetType: string;
  mintPubkey: string;
  balance: number;
  balanceFormatted: number;
  navPrice: number;
  usdValue: number;
  imageUrl?: string;
}

export interface PortfolioResponse {
  wallet: string;
  holdings: PortfolioHolding[];
  totalUsdValue: number;
}

export async function fetchPortfolio(wallet: string): Promise<PortfolioResponse> {
  return get<PortfolioResponse>(`/portfolio?wallet=${wallet}`);
}

// --- Activity ---

export interface ActivityEntry {
  id: string;
  action: string;
  actor: string;
  target?: string;
  details?: Record<string, unknown>;
  txSignature?: string;
  timestamp: number;
}

export async function fetchActivity(limit = 20, offset = 0): Promise<{ activity: ActivityEntry[]; total: number; hasMore: boolean }> {
  return get(`/activity?limit=${limit}&offset=${offset}`);
}

export async function logActivity(entry: {
  action: string;
  actor: string;
  target?: string;
  txSignature?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await post("/activity", entry);
}
