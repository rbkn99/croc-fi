import { Router, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { prisma, AssetType } from "@prooflayer/shared";
import { RegistryReader } from "../services/registry-reader";
import { AssetMetaStore } from "../services/asset-meta-store";
import { requireAuth } from "../middleware/auth";

const ASSET_TYPE_VALUES: Record<string, AssetType> = {
  Treasury: AssetType.Treasury,
  CorporateBond: AssetType.CorporateBond,
  MoneyMarket: AssetType.MoneyMarket,
  Commodity: AssetType.Commodity,
};

export function createAssetsRouter(
  reader: RegistryReader,
  metaStore: AssetMetaStore
): Router {
  const router = Router();

  // --- Asset Metadata (off-chain, issuer-provided) ---
  // These MUST come before /:pubkey to avoid "meta" matching as a pubkey

  router.get("/meta/list", async (_req: Request, res: Response) => {
    const all = await metaStore.getAll();
    res.json({ assets: all });
  });

  router.get("/meta/:assetId", async (req: Request, res: Response) => {
    const assetId = String(req.params.assetId);
    const meta = await metaStore.getByAssetId(assetId);
    if (!meta) {
      res.status(404).json({ error: "Asset metadata not found" });
      return;
    }
    res.json(meta);
  });

  router.get("/meta/:assetId/policy", async (req: Request, res: Response) => {
    const assetId = String(req.params.assetId);
    const meta = await metaStore.getByAssetId(assetId);
    const policy = metaStore.getPolicyInfo(assetId, meta);
    if (!policy) {
      res.status(404).json({ error: "Asset policy not found" });
      return;
    }
    res.json(policy);
  });

  router.post("/meta/:assetId", requireAuth, async (req: Request, res: Response) => {
    const assetId = String(req.params.assetId);
    const partial = req.body as import("@prooflayer/shared").AssetMetadata;
    const meta = await metaStore.upsert(assetId, partial);
    res.json(meta);
  });

  router.post("/meta/:assetId/documents", requireAuth, async (req: Request, res: Response) => {
    const assetId = String(req.params.assetId);
    const { title, type, url, publishedAt, hash } = req.body as {
      title?: string;
      type?: string;
      url?: string;
      publishedAt?: string;
      hash?: string;
    };
    if (!title || !type || !url) {
      res.status(400).json({ error: "title, type, and url are required" });
      return;
    }
    const updated = await metaStore.addDocument(assetId, { title, type: type as import("@prooflayer/shared").AssetDocument["type"], url, publishedAt, hash });
    res.json({ documents: updated.documents });
  });

  router.delete("/meta/:assetId/documents/:index", requireAuth, async (req: Request, res: Response) => {
    const assetId = String(req.params.assetId);
    const index = parseInt(String(req.params.index), 10);
    if (isNaN(index)) {
      res.status(400).json({ error: "Invalid document index" });
      return;
    }
    const updated = await metaStore.removeDocument(assetId, index);
    if (!updated) {
      res.status(404).json({ error: "Asset not found or index out of range" });
      return;
    }
    res.json({ documents: updated.documents });
  });

  // --- Register new asset (save issuer application to DB) ---

  router.post("/register", async (req: Request, res: Response) => {
    const {
      mintPubkey,
      issuerWallet,
      institutionName,
      contactName,
      email,
      jurisdiction,
      assetType,
      aumEstimate,
      description,
      logoUrl,
      minMintAmount,
      minRedeemAmount,
      dailyMintLimit,
      dailyRedeemLimit,
    } = req.body as Record<string, unknown>;

    if (!mintPubkey || !issuerWallet || !institutionName || !contactName || !email || !assetType) {
      res.status(400).json({ error: "mintPubkey, issuerWallet, institutionName, contactName, email, and assetType are required" });
      return;
    }

    try {
      const record = await prisma.issuerApplication.upsert({
        where: { mintPubkey: String(mintPubkey) },
        update: {},
        create: {
          mintPubkey: String(mintPubkey),
          issuerWallet: String(issuerWallet),
          institutionName: String(institutionName),
          contactName: String(contactName),
          email: String(email),
          jurisdiction: jurisdiction ? String(jurisdiction) : null,
          assetType: String(assetType),
          aumEstimate: aumEstimate ? String(aumEstimate) : null,
          description: description ? String(description) : null,
          logoUrl: logoUrl ? String(logoUrl) : null,
          minMintAmount: Number(minMintAmount) || 0,
          minRedeemAmount: Number(minRedeemAmount) || 0,
          dailyMintLimit: Number(dailyMintLimit) || 0,
          dailyRedeemLimit: Number(dailyRedeemLimit) || 0,
        },
      });

      // Also upsert into AssetMeta so the asset appears in the products list
      const assetId = String(mintPubkey);
      const ticker = String(institutionName).slice(0, 6).toUpperCase().replace(/\s/g, "");
      const resolvedAssetType = ASSET_TYPE_VALUES[String(assetType)] ?? AssetType.Treasury;

      await metaStore.upsert(assetId, {
        name: String(institutionName),
        ticker,
        assetType: resolvedAssetType,
        description: description ? String(description) : "",
        mintPubkey: String(mintPubkey),
        issuerPubkey: String(issuerWallet),
        imageUrl: logoUrl ? String(logoUrl) : undefined,
      });

      res.json({ status: "ok", id: record.id });
    } catch (err) {
      console.error("[Assets] Register failed:", err);
      res.status(500).json({ error: "Failed to register asset" });
    }
  });

  // --- On-chain asset reads ---

  router.get("/:pubkey", async (req: Request, res: Response) => {
    try {
      const pubkey = new PublicKey(req.params.pubkey);
      const asset = await reader.getAsset(pubkey);

      if (!asset) {
        res.status(404).json({ error: "Asset not found" });
        return;
      }

      res.json({
        issuer: asset.issuer.toBase58(),
        attestor: asset.attestor.toBase58(),
        assetType: asset.assetType,
        status: asset.status,
        createdAt: asset.createdAt,
      });
    } catch {
      res.status(400).json({ error: "Invalid public key" });
    }
  });

  router.get("/:pubkey/attestation", async (req: Request, res: Response) => {
    try {
      const pubkey = new PublicKey(req.params.pubkey);
      const attestation = await reader.getAttestation(pubkey);

      if (!attestation) {
        res.status(404).json({ error: "Attestation not found" });
        return;
      }

      const now = Math.floor(Date.now() / 1000);

      res.json({
        asset: attestation.asset.toBase58(),
        navBps: attestation.navBps,
        yieldRateBps: attestation.yieldRateBps,
        proofHash: Buffer.from(attestation.proofHash).toString("hex"),
        validUntil: attestation.validUntil,
        isFresh: attestation.validUntil > now,
        publishedAt: attestation.publishedAt,
      });
    } catch {
      res.status(400).json({ error: "Invalid public key" });
    }
  });

  router.get("/:pubkey/health", async (req: Request, res: Response) => {
    try {
      const pubkey = new PublicKey(req.params.pubkey);
      const health = await reader.getAssetHealth(pubkey);

      if (!health) {
        res.status(404).json({ error: "Asset not found" });
        return;
      }

      res.json(health);
    } catch {
      res.status(400).json({ error: "Invalid public key" });
    }
  });

  router.get(
    "/:pubkey/whitelist/:wallet",
    async (req: Request, res: Response) => {
      try {
        const assetPubkey = new PublicKey(req.params.pubkey);
        const wallet = new PublicKey(req.params.wallet);
        const isWhitelisted = await reader.isWhitelisted(assetPubkey, wallet);

        res.json({ isWhitelisted });
      } catch {
        res.status(400).json({ error: "Invalid public key" });
      }
    }
  );

  return router;
}
