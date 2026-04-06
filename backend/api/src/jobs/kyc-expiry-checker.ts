import { PublicKey } from "@solana/web3.js";
import { PolicyConfig, InvestorTier } from "@prooflayer/shared";
import { kycStore } from "../services/kyc-store";
import { PolicySyncService } from "../services/policy-sync";

/**
 * Periodic job that checks for expired KYC records
 * and removes corresponding wallets from on-chain whitelist.
 */
export class KycExpiryChecker {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private policySyncService: PolicySyncService,
    private intervalMs: number
  ) {}

  start(): void {
    console.log(`[KYC Expiry Checker] Started. Interval: ${this.intervalMs}ms`);

    this.check().catch(console.error);

    this.intervalHandle = setInterval(() => {
      this.check().catch(console.error);
    }, this.intervalMs);
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log("[KYC Expiry Checker] Stopped.");
    }
  }

  private async check(): Promise<void> {
    const expired = await kycStore.getExpired();

    if (expired.length === 0) return;

    console.log(`[KYC Expiry Checker] Found ${expired.length} expired records`);

    const assetPubkeyStr = process.env.DEFAULT_ASSET_PUBKEY;
    if (!assetPubkeyStr) return;

    const assetPubkey = new PublicKey(assetPubkeyStr);

    const policy: PolicyConfig = {
      assetId: assetPubkeyStr,
      requiredTier: InvestorTier.Accredited,
      allowedJurisdictions: [],
      blockedJurisdictions: ["KP", "IR", "CU", "SY"],
      requireFreshAttestation: true,
      maxAttestationAgeSec: 86400,
    };

    for (const record of expired) {
      await kycStore.setExpired(record.wallet);

      const updatedRecord = await kycStore.get(record.wallet);
      if (!updatedRecord) continue;

      const result = await this.policySyncService.syncWalletStatus(
        updatedRecord,
        assetPubkey,
        policy
      );
      console.log(`[KYC Expiry] ${record.wallet}: ${result.action} — ${result.reason}`);
    }

    // Log wallets expiring within 7 days as warnings
    const expiringSoon = await kycStore.getExpiring(7 * 86400);
    if (expiringSoon.length > 0) {
      console.warn(
        `[KYC Expiry Warning] ${expiringSoon.length} wallets expiring within 7 days`
      );
    }
  }
}
