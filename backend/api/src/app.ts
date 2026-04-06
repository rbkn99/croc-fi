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
import { createUploadsRouter, UPLOADS_DIR } from "./routes/uploads";
import { InstitutionService } from "./services/institution-service";
import { requireAuth, requireIssuer, requireInstitution } from "./middleware/auth";
import { errorHandler } from "./middleware/error-handler";

export function createApp() {
  const config = loadConfig();

  const app = express();

  // --- Security ---
  app.use(helmet());

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim());
  app.use(cors(allowedOrigins?.length ? { origin: allowedOrigins } : {}));

  // Global rate limit: 100 req/min
  app.use(rateLimit({ windowMs: 60_000, limit: 100, standardHeaders: true, legacyHeaders: false }));

  app.use(express.json());

  // --- Static file serving ---
  app.use("/uploads", express.static(UPLOADS_DIR));

  // --- Services ---

  const reader = new RegistryReader(config.rpcUrl);
  const metaStore = new AssetMetaStore();
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

  const serverBaseUrl = `http://localhost:${config.apiPort}`;

  // Public
  app.use("/api/v1/auth", createAuthRouter());
  app.use("/api/v1/uploads", createUploadsRouter(serverBaseUrl));
  app.use("/api/v1/products", createProductsRouter(reader, metaStore));
  app.use("/api/v1/assets", createAssetsRouter(reader, metaStore));
  app.use("/api/v1/kyc", createKycRouter(kycProvider, policySyncService));

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

  app.use(errorHandler);

  return { app, config, policySyncService };
}
