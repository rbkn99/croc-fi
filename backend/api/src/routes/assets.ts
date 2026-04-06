import { Router, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { RegistryReader } from "../services/registry-reader";
import { AssetMetaStore } from "../services/asset-meta-store";

export function createAssetsRouter(
  reader: RegistryReader,
  metaStore: AssetMetaStore
): Router {
  const router = Router();

  // --- Asset Metadata (off-chain, issuer-provided) ---
  // These MUST come before /:pubkey to avoid "meta" matching as a pubkey

  router.get("/meta/list", (_req: Request, res: Response) => {
    const all = metaStore.getAll();
    res.json({ assets: all });
  });

  router.get("/meta/:assetId", (req: Request, res: Response) => {
    const assetId = String(req.params.assetId);
    const meta = metaStore.getByAssetId(assetId);
    if (!meta) {
      res.status(404).json({ error: "Asset metadata not found" });
      return;
    }
    res.json(meta);
  });

  router.get("/meta/:assetId/policy", (req: Request, res: Response) => {
    const assetId = String(req.params.assetId);
    const policy = metaStore.getPolicyInfo(assetId);
    if (!policy) {
      res.status(404).json({ error: "Asset policy not found" });
      return;
    }
    res.json(policy);
  });

  router.post("/meta/:assetId/documents", (req: Request, res: Response) => {
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
    const updated = metaStore.addDocument(assetId, { title, type: type as import("@prooflayer/shared").AssetDocument["type"], url, publishedAt, hash });
    if (!updated) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }
    res.json({ documents: updated.documents });
  });

  router.delete("/meta/:assetId/documents/:index", (req: Request, res: Response) => {
    const assetId = String(req.params.assetId);
    const index = parseInt(String(req.params.index), 10);
    if (isNaN(index)) {
      res.status(400).json({ error: "Invalid document index" });
      return;
    }
    const updated = metaStore.removeDocument(assetId, index);
    if (!updated) {
      res.status(404).json({ error: "Asset not found or index out of range" });
      return;
    }
    res.json({ documents: updated.documents });
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
