import { Router, Request, Response } from "express";
import { PublicKey, Keypair } from "@solana/web3.js";
import { KycStatus, KycWebhookPayload, InvestorTier, PolicyConfig, loadConfig } from "@prooflayer/shared";
import { KycProvider } from "../services/kyc-provider";
import { kycStore } from "../services/kyc-store";
import { PolicySyncService } from "../services/policy-sync";

const DEFAULT_POLICY: PolicyConfig = {
  assetId: "default",
  requiredTier: InvestorTier.Accredited,
  allowedJurisdictions: [],
  blockedJurisdictions: ["KP", "IR", "CU", "SY"],
  requireFreshAttestation: true,
  maxAttestationAgeSec: 86400,
};

export function createKycRouter(
  kycProvider: KycProvider,
  policySyncService: PolicySyncService
): Router {
  const router = Router();
  const config = loadConfig();

  /**
   * POST /api/v1/kyc/webhook
   * Receives KYC verification results from provider (Sumsub, etc.).
   * On approval: updates KYC store → syncs on-chain whitelist.
   */
  router.post("/webhook", async (req: Request, res: Response) => {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers["x-webhook-signature"] as string ?? "";

    if (config.kyc.provider !== "manual") {
      if (!kycProvider.verifyWebhookSignature(rawBody, signature)) {
        res.status(401).json({ error: "Invalid webhook signature" });
        return;
      }
    }

    try {
      const payload = req.body as KycWebhookPayload;
      const wallet = payload.externalUserId;

      if (!wallet) {
        res.status(400).json({ error: "Missing externalUserId (wallet)" });
        return;
      }

      const result = kycProvider.parseWebhook(payload);
      const now = Math.floor(Date.now() / 1000);

      const record = await kycStore.upsert(wallet, {
        externalId: payload.applicantId,
        provider: config.kyc.provider,
        status: result.status,
        tier: result.tier,
        jurisdiction: result.jurisdiction,
        rejectionReason: result.rejectionReason,
        verifiedAt: result.status === KycStatus.Approved ? now : null,
        expiresAt: result.status === KycStatus.Approved
          ? now + config.kyc.kycExpiryDays * 86400
          : null,
      });

      console.log(`[KYC Webhook] ${wallet}: ${result.status} (tier: ${result.tier})`);

      // Sync to on-chain whitelist for all managed assets
      // In production, iterate over all assets the wallet is relevant for
      // For MVP, sync against a known asset pubkey from env
      const assetPubkeyStr = process.env.DEFAULT_ASSET_PUBKEY;
      if (assetPubkeyStr) {
        const assetPubkey = new PublicKey(assetPubkeyStr);
        const syncResult = await policySyncService.syncWalletStatus(
          record,
          assetPubkey,
          DEFAULT_POLICY
        );
        console.log(`[KYC → Whitelist] ${wallet}: ${syncResult.action} — ${syncResult.reason}`);
      }

      res.json({ status: "ok", kycStatus: record.status });
    } catch (err) {
      console.error("[KYC Webhook] Error:", err);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  /**
   * POST /api/v1/kyc/start
   * Initiates KYC verification for a wallet.
   * Returns a URL the user should visit to complete verification.
   */
  router.post("/start", async (req: Request, res: Response) => {
    const { wallet } = req.body;

    if (!wallet || typeof wallet !== "string") {
      res.status(400).json({ error: "wallet is required" });
      return;
    }

    try {
      const existing = await kycStore.get(wallet);
      if (existing?.status === KycStatus.Approved) {
        res.json({
          status: "already_approved",
          tier: existing.tier,
          expiresAt: existing.expiresAt,
        });
        return;
      }

      const applicantId = await kycProvider.createApplicant(wallet, wallet);
      const verificationUrl = await kycProvider.getVerificationUrl(applicantId);

      await kycStore.upsert(wallet, {
        externalId: applicantId,
        provider: config.kyc.provider,
        status: KycStatus.Pending,
      });

      res.json({
        status: "pending",
        applicantId,
        verificationUrl,
      });
    } catch (err) {
      console.error("[KYC Start] Error:", err);
      res.status(500).json({ error: "Failed to initiate KYC" });
    }
  });

  /**
   * GET /api/v1/kyc/status/:wallet
   * Returns the current KYC status for a wallet.
   */
  router.get("/status/:wallet", async (req: Request, res: Response) => {
    const wallet = String(req.params.wallet);
    const record = await kycStore.get(wallet);

    if (!record) {
      res.json({ status: "not_started", wallet });
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const isExpired = record.expiresAt !== null && record.expiresAt <= now;

    res.json({
      wallet: record.wallet,
      status: isExpired ? KycStatus.Expired : record.status,
      tier: record.tier,
      jurisdiction: record.jurisdiction,
      verifiedAt: record.verifiedAt,
      expiresAt: record.expiresAt,
      isExpired,
    });
  });

  /**
   * GET /api/v1/kyc/list
   * Returns all KYC records (admin endpoint).
   */
  router.get("/list", async (_req: Request, res: Response) => {
    const records = await kycStore.all();
    res.json({ total: records.length, records });
  });

  return router;
}
