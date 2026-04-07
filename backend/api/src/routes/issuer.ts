import { Router, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { RegistryReader } from "../services/registry-reader";
import { kycStore } from "../services/kyc-store";
import { PolicySyncService } from "../services/policy-sync";
import { InvestorTier, PolicyConfig } from "@prooflayer/shared";
import { prisma } from "@prooflayer/shared";

export function createIssuerRouter(
  reader: RegistryReader,
  policySyncService: PolicySyncService
): Router {
  const router = Router();

  /**
   * POST /api/v1/issuer/whitelist/add
   * Manually add a wallet to on-chain whitelist (after KYC or by issuer override).
   */
  router.post("/whitelist/add", async (req: Request, res: Response) => {
    const { assetPubkey, wallet } = req.body;

    if (!assetPubkey || !wallet) {
      res.status(400).json({ error: "assetPubkey and wallet are required" });
      return;
    }

    try {
      const asset = new PublicKey(assetPubkey);
      const walletPk = new PublicKey(wallet);

      const isAlready = await reader.isWhitelisted(asset, walletPk);
      if (isAlready) {
        res.json({ status: "already_whitelisted" });
        return;
      }

      // TODO: call add_to_whitelist on-chain via issuer keypair
      console.log(`[Issuer] Adding ${wallet} to whitelist for ${assetPubkey}`);

      res.json({ status: "added", wallet, assetPubkey });
    } catch (err) {
      res.status(400).json({ error: "Invalid public key" });
    }
  });

  /**
   * POST /api/v1/issuer/whitelist/remove
   * Remove a wallet from on-chain whitelist.
   */
  router.post("/whitelist/remove", async (req: Request, res: Response) => {
    const { assetPubkey, wallet } = req.body;

    if (!assetPubkey || !wallet) {
      res.status(400).json({ error: "assetPubkey and wallet are required" });
      return;
    }

    try {
      // TODO: call remove_from_whitelist on-chain
      console.log(`[Issuer] Removing ${wallet} from whitelist for ${assetPubkey}`);

      res.json({ status: "removed", wallet, assetPubkey });
    } catch (err) {
      res.status(400).json({ error: "Invalid public key" });
    }
  });

  /**
   * POST /api/v1/issuer/whitelist/sync
   * Re-sync all approved KYC records to on-chain whitelist for a given asset.
   * Useful after policy config changes.
   */
  router.post("/whitelist/sync", async (req: Request, res: Response) => {
    const { assetPubkey, policyConfig } = req.body;

    if (!assetPubkey) {
      res.status(400).json({ error: "assetPubkey is required" });
      return;
    }

    const policy: PolicyConfig = policyConfig ?? {
      assetId: assetPubkey,
      requiredTier: InvestorTier.Accredited,
      allowedJurisdictions: [],
      blockedJurisdictions: ["KP", "IR", "CU", "SY"],
      requireFreshAttestation: true,
      maxAttestationAgeSec: 86400,
    };

    try {
      const asset = new PublicKey(assetPubkey);
      const approved = await kycStore.getApproved();

      const results = [];
      for (const record of approved) {
        const result = await policySyncService.syncWalletStatus(record, asset, policy);
        results.push({ wallet: record.wallet, ...result });
      }

      res.json({
        status: "ok",
        synced: results.length,
        results,
      });
    } catch (err) {
      res.status(400).json({ error: "Sync failed" });
    }
  });

  /**
   * GET /api/v1/issuer/kyc-summary
   * Summary of KYC pipeline state.
   */
  router.get("/kyc-summary", async (_req: Request, res: Response) => {
    const all = await kycStore.all();
    const expiring = await kycStore.getExpiring(7 * 86400);
    const summary = {
      total: all.length,
      approved: all.filter((r) => r.status === "approved").length,
      pending: all.filter((r) => r.status === "pending").length,
      rejected: all.filter((r) => r.status === "rejected").length,
      expired: all.filter((r) => r.status === "expired").length,
      expiringIn7d: expiring.length,
    };
    res.json(summary);
  });

  /**
   * GET /api/v1/issuer/applications
   * List all submitted issuer applications.
   */
  router.get("/applications", async (_req: Request, res: Response) => {
    const applications = await prisma.issuerApplication.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ applications });
  });

  return router;
}
