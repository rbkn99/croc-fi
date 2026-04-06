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

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, { method: "DELETE" });
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

// --- KYC ---

export async function fetchKycStatus(wallet: string): Promise<KycStatusResponse> {
  return get<KycStatusResponse>(`/kyc/status/${wallet}`);
}

export async function startKyc(wallet: string): Promise<unknown> {
  return post("/kyc/start", { wallet });
}

export async function fetchKycSummary(): Promise<unknown> {
  return get("/kyc/summary");
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
