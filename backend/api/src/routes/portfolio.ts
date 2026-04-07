import { Router, Request, Response } from "express";
import { Connection, PublicKey } from "@solana/web3.js";
import { AssetMetaStore } from "../services/asset-meta-store";
import { RegistryReader } from "../services/registry-reader";
import { NAV_BPS_SCALE } from "@prooflayer/shared";

export function createPortfolioRouter(
  reader: RegistryReader,
  metaStore: AssetMetaStore,
  rpcUrl: string
): Router {
  const router = Router();
  const connection = new Connection(rpcUrl, "confirmed");

  // GET /api/v1/portfolio?wallet=<pubkey>
  router.get("/", async (req: Request, res: Response) => {
    const wallet = (req.query.wallet as string) || req.wallet;

    if (!wallet) {
      res.status(400).json({ error: "wallet query param is required" });
      return;
    }

    let walletPk: PublicKey;
    try {
      walletPk = new PublicKey(wallet);
    } catch {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }

    const assets = await metaStore.getAll();
    const holdings: Array<{
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
    }> = [];

    for (const asset of assets) {
      if (!asset.mintPubkey) continue;
      try {
        const mint = new PublicKey(asset.mintPubkey);
        const accounts = await connection.getTokenAccountsByOwner(walletPk, { mint });

        for (const { account } of accounts.value) {
          const balance = Number(account.data.readBigUInt64LE(64));
          if (balance <= 0) continue;

          let navBps = NAV_BPS_SCALE;
          if (asset.issuerPubkey) {
            const health = await reader
              .getAssetHealth(new PublicKey(asset.issuerPubkey))
              .catch(() => null);
            if (health) navBps = health.navBps;
          }

          const navPrice = navBps / NAV_BPS_SCALE;
          const balanceFormatted = balance / 1e6; // Token-2022 decimals = 6

          holdings.push({
            assetId: asset.assetId,
            name: asset.name,
            ticker: asset.ticker,
            assetType: asset.assetType,
            mintPubkey: asset.mintPubkey,
            balance,
            balanceFormatted,
            navPrice,
            usdValue: balanceFormatted * navPrice,
            imageUrl: asset.imageUrl,
          });
        }
      } catch {
        // RPC error — skip this asset
      }
    }

    const totalUsdValue = holdings.reduce((s, h) => s + h.usdValue, 0);
    res.json({ wallet, holdings, totalUsdValue });
  });

  return router;
}
