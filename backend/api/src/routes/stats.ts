import { Router, Request, Response } from "express";
import { Connection, PublicKey } from "@solana/web3.js";
import { AssetMetaStore } from "../services/asset-meta-store";
import { RegistryReader } from "../services/registry-reader";
import { NAV_BPS_SCALE } from "@prooflayer/shared";

export function createStatsRouter(
  reader: RegistryReader,
  metaStore: AssetMetaStore,
  rpcUrl: string
): Router {
  const router = Router();
  const connection = new Connection(rpcUrl, "confirmed");

  router.get("/", async (_req: Request, res: Response) => {
    const assets = await metaStore.getAll();
    let totalTvl = 0;
    let yieldSum = 0;
    let yieldCount = 0;

    for (const asset of assets) {
      try {
        // TVL: total token supply * NAV price
        if (asset.mintPubkey) {
          const supply = await connection.getTokenSupply(new PublicKey(asset.mintPubkey));
          const uiAmount = supply.value.uiAmount ?? 0;

          let navBps = NAV_BPS_SCALE;
          if (asset.issuerPubkey) {
            const health = await reader.getAssetHealth(new PublicKey(asset.issuerPubkey)).catch(() => null);
            if (health) {
              navBps = health.navBps;
              yieldSum += health.yieldRateBps;
              yieldCount++;
            }
          }
          totalTvl += uiAmount * (navBps / NAV_BPS_SCALE);
        }
      } catch {
        // RPC or PDA error — skip asset
      }
    }

    res.json({
      totalProducts: assets.length,
      totalTvl: Math.round(totalTvl),
      avgYieldBps: yieldCount > 0 ? Math.round(yieldSum / yieldCount) : 0,
      lastUpdated: Date.now(),
    });
  });

  return router;
}
