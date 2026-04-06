import { Router, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { AssetMetadata, NAV_BPS_SCALE, YIELD_BPS_SCALE } from "@prooflayer/shared";
import { RegistryReader } from "../services/registry-reader";
import { AssetMetaStore } from "../services/asset-meta-store";

interface ProductResponse {
  id: string;
  name: string;
  ticker: string;
  assetType: string;
  description: string;
  price: number;
  apy: number;
  apy7d: number;
  apy30d: number;
  tvl: number;
  status: string;
  isFresh: boolean;
  navBps: number;
  yieldRateBps: number;
  mintFeeBps: number;
  redeemFeeBps: number;
  managementFeeBps: number;
  onChainPubkey: string | null;
  mintPubkey: string | null;
}

export function createProductsRouter(
  reader: RegistryReader,
  metaStore: AssetMetaStore
): Router {
  const router = Router();

  router.get("/", async (_req: Request, res: Response) => {
    const allMeta = metaStore.getAll();
    const products: ProductResponse[] = [];

    for (const meta of allMeta) {
      const product = await buildProductResponse(meta, reader);
      products.push(product);
    }

    res.json({ products });
  });

  router.get("/:id", async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const meta = metaStore.getByAssetId(id);

    if (!meta) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const product = await buildProductResponse(meta, reader);
    res.json({
      ...product,
      legalStructure: meta.legalStructure,
      counterparties: meta.counterparties,
      documents: meta.documents,
      underlying: meta.underlying,
      links: meta.links,
    });
  });

  return router;
}

async function buildProductResponse(
  meta: AssetMetadata,
  reader: RegistryReader
): Promise<ProductResponse> {
  let navBps = NAV_BPS_SCALE;
  let yieldRateBps = 0;
  let status = "unknown";
  let isFresh = false;

  if (meta.issuerPubkey) {
    try {
      // Derive asset PDA from the program — for now use issuerPubkey as a hint
      // In production, AssetMeta would store the actual on-chain asset PDA
      const pubkey = new PublicKey(meta.issuerPubkey);
      const health = await reader.getAssetHealth(pubkey);
      if (health) {
        navBps = health.navBps;
        yieldRateBps = health.yieldRateBps;
        status = health.isActive ? "active" : "paused";
        isFresh = health.isAttestationFresh;
      }
    } catch {
      // On-chain read failed — use defaults
    }
  }

  return {
    id: meta.assetId,
    name: meta.name,
    ticker: meta.ticker,
    assetType: meta.assetType,
    description: meta.description,
    price: navBps / NAV_BPS_SCALE,
    apy: yieldRateBps / (YIELD_BPS_SCALE / 100),
    apy7d: yieldRateBps / (YIELD_BPS_SCALE / 100),
    apy30d: yieldRateBps / (YIELD_BPS_SCALE / 100),
    tvl: 0,
    status,
    isFresh,
    navBps,
    yieldRateBps,
    mintFeeBps: meta.fees.mintFeeBps,
    redeemFeeBps: meta.fees.redeemFeeBps,
    managementFeeBps: meta.fees.managementFeeBps,
    onChainPubkey: meta.issuerPubkey ?? null,
    mintPubkey: meta.mintPubkey ?? null,
  };
}
