import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Keypair } from "@solana/web3.js";
import { readFileSync, existsSync } from "fs";
import { loadConfig } from "@prooflayer/shared";
import { RegistryReader } from "./services/registry-reader";
import { AssetMetaStore } from "./services/asset-meta-store";
import { createKycProvider } from "./services/kyc-provider";
import { PolicySyncService } from "./services/policy-sync";
import { createAssetsRouter } from "./routes/assets";
import { createKycRouter } from "./routes/kyc";
import { createIssuerRouter } from "./routes/issuer";
import { createAuthRouter } from "./routes/auth";
import { createProductsRouter } from "./routes/products";
import { createInstitutionRouter } from "./routes/institution";
import { createUploadsRouter, createFilesRouter } from "./routes/uploads";
import { createStatsRouter } from "./routes/stats";
import { createPortfolioRouter } from "./routes/portfolio";
import { createActivityRouter } from "./routes/activity";
import { InstitutionService } from "./services/institution-service";
import { requireAuth, requireIssuer, requireInstitution } from "./middleware/auth";
import { errorHandler } from "./middleware/error-handler";
import { prisma, AssetType } from "@prooflayer/shared";

const ASSET_TYPE_VALUES: Record<string, AssetType> = {
  Treasury: AssetType.Treasury,
  CorporateBond: AssetType.CorporateBond,
  MoneyMarket: AssetType.MoneyMarket,
  Commodity: AssetType.Commodity,
};

export function createApp() {
  const config = loadConfig();

  const app = express();

  // Trust reverse proxy (Railway, Vercel, etc.)
  app.set("trust proxy", 1);

  // --- Security ---
  app.use(helmet());

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim());
  app.use(cors(allowedOrigins?.length ? { origin: allowedOrigins } : {}));

  // Global rate limit: 100 req/min
  app.use(rateLimit({ windowMs: 60_000, limit: 100, standardHeaders: true, legacyHeaders: false }));

  app.use(express.json());

  // --- Services ---

  const reader = new RegistryReader(config.rpcUrl);
  const metaStore = new AssetMetaStore();

  // Backfill: sync any IssuerApplication records that aren't yet in AssetMeta
  prisma.issuerApplication.findMany().then(async (apps) => {
    for (const app of apps) {
      const existing = await metaStore.getByAssetId(app.mintPubkey);
      if (!existing) {
        const ticker = app.institutionName.slice(0, 6).toUpperCase().replace(/\s/g, "");
        await metaStore.upsert(app.mintPubkey, {
          name: app.institutionName,
          ticker,
          assetType: ASSET_TYPE_VALUES[app.assetType] ?? AssetType.Treasury,
          description: app.description ?? "",
          mintPubkey: app.mintPubkey,
          issuerPubkey: app.issuerWallet,
          imageUrl: app.logoUrl ?? undefined,
        });
        console.log(`[Backfill] Synced IssuerApplication → AssetMeta: ${app.mintPubkey}`);
      }
    }
  }).catch((err) => console.warn("[Backfill] Failed:", err));
  const kycProvider = createKycProvider(config.kyc);

  let issuerKeypair: Keypair;
  if (existsSync(config.issuerKeyPath)) {
    const keyData = JSON.parse(readFileSync(config.issuerKeyPath, "utf-8"));
    issuerKeypair = Keypair.fromSecretKey(Uint8Array.from(keyData));
  } else {
    issuerKeypair = Keypair.generate();
  }

  const policySyncService = new PolicySyncService(config.rpcUrl, issuerKeypair);

  // --- Routes ---

  // Public
  app.use("/api/v1/auth", createAuthRouter());
  app.use("/api/v1/uploads", createUploadsRouter());
  app.use("/api/v1/files", createFilesRouter());
  app.use("/api/v1/products", createProductsRouter(reader, metaStore));
  app.use("/api/v1/assets", createAssetsRouter(reader, metaStore));
  app.use("/api/v1/kyc", createKycRouter(kycProvider, policySyncService));
  app.use("/api/v1/stats", createStatsRouter(reader, metaStore, config.rpcUrl));
  app.use("/api/v1/activity", createActivityRouter());

  // Protected: any authenticated wallet
  app.use("/api/v1/portfolio", createPortfolioRouter(reader, metaStore, config.rpcUrl));

  // Protected: issuer only
  app.use("/api/v1/issuer", requireAuth, requireIssuer, createIssuerRouter(reader, policySyncService));

  // Protected: institutional investors
  const institutionService = new InstitutionService(config.rpcUrl, metaStore);
  app.use("/api/v1/institution", requireAuth, requireInstitution, createInstitutionRouter(institutionService));

  app.get("/api/v1/health", (_req, res) => {
    res.json({
      status: "ok",
      cluster: config.cluster,
      kycProvider: config.kyc.provider,
    });
  });

  // Root redirect for health checks / uptime monitors
  app.get("/", (_req, res) => {
    res.redirect("/api/v1/health");
  });

  app.use(errorHandler);

  return { app, config, policySyncService };
}
