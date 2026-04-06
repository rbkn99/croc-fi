import "dotenv/config";
import { createApp } from "./app";
import { KycExpiryChecker } from "./jobs/kyc-expiry-checker";

const { app, config, policySyncService } = createApp();

const kycExpiryChecker = new KycExpiryChecker(
  policySyncService,
  config.kycExpiryCheckIntervalMs
);

app.listen(config.apiPort, () => {
  console.log(`ProofLayer API running on port ${config.apiPort}`);
  console.log(`Cluster: ${config.cluster}`);
  console.log(`RPC: ${config.rpcUrl}`);
  console.log(`KYC provider: ${config.kyc.provider}`);

  kycExpiryChecker.start();
});

process.on("SIGINT", () => {
  kycExpiryChecker.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  kycExpiryChecker.stop();
  process.exit(0);
});
