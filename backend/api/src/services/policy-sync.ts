import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  KycRecord,
  KycStatus,
  InvestorTier,
  PolicyConfig,
  PROOF_LAYER_PROGRAM_ID,
} from "@prooflayer/shared";

/**
 * Policy sync: bridges off-chain KYC status to on-chain whitelist.
 *
 * Flow:
 *   KYC approved → check policy config (tier, jurisdiction) → add_to_whitelist on-chain
 *   KYC expired  → remove_from_whitelist on-chain
 *   KYC rejected → remove_from_whitelist if was whitelisted
 */
export class PolicySyncService {
  private connection: Connection;
  private issuerKeypair: Keypair;

  constructor(rpcUrl: string, issuerKeypair: Keypair) {
    this.connection = new Connection(rpcUrl, "confirmed");
    this.issuerKeypair = issuerKeypair;
  }

  async syncWalletStatus(
    kycRecord: KycRecord,
    assetPubkey: PublicKey,
    policyConfig: PolicyConfig
  ): Promise<{ action: "added" | "removed" | "skipped"; reason: string }> {
    const wallet = new PublicKey(kycRecord.wallet);
    const isCurrentlyWhitelisted = await this.checkWhitelist(assetPubkey, wallet);

    if (kycRecord.status === KycStatus.Approved) {
      if (!this.meetsPolicy(kycRecord, policyConfig)) {
        if (isCurrentlyWhitelisted) {
          await this.removeFromWhitelist(assetPubkey, wallet);
          return { action: "removed", reason: "Policy requirements not met" };
        }
        return { action: "skipped", reason: "Policy requirements not met" };
      }

      if (!isCurrentlyWhitelisted) {
        await this.addToWhitelist(assetPubkey, wallet);
        return { action: "added", reason: "KYC approved, policy passed" };
      }

      return { action: "skipped", reason: "Already whitelisted" };
    }

    if (
      kycRecord.status === KycStatus.Expired ||
      kycRecord.status === KycStatus.Rejected
    ) {
      if (isCurrentlyWhitelisted) {
        await this.removeFromWhitelist(assetPubkey, wallet);
        return { action: "removed", reason: `KYC status: ${kycRecord.status}` };
      }
      return { action: "skipped", reason: `KYC ${kycRecord.status}, not whitelisted` };
    }

    return { action: "skipped", reason: `KYC status: ${kycRecord.status}` };
  }

  private meetsPolicy(record: KycRecord, config: PolicyConfig): boolean {
    const tierOrder: Record<InvestorTier, number> = {
      [InvestorTier.Retail]: 0,
      [InvestorTier.Accredited]: 1,
      [InvestorTier.QualifiedPurchaser]: 2,
      [InvestorTier.Institutional]: 3,
    };

    if (tierOrder[record.tier] < tierOrder[config.requiredTier]) {
      return false;
    }

    if (
      config.blockedJurisdictions.length > 0 &&
      config.blockedJurisdictions.includes(record.jurisdiction)
    ) {
      return false;
    }

    if (
      config.allowedJurisdictions.length > 0 &&
      !config.allowedJurisdictions.includes(record.jurisdiction)
    ) {
      return false;
    }

    return true;
  }

  private async checkWhitelist(asset: PublicKey, wallet: PublicKey): Promise<boolean> {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), asset.toBuffer(), wallet.toBuffer()],
      PROOF_LAYER_PROGRAM_ID
    );
    const info = await this.connection.getAccountInfo(pda);
    return info !== null;
  }

  private async addToWhitelist(asset: PublicKey, wallet: PublicKey): Promise<string> {
    // TODO: build and send add_to_whitelist instruction via Anchor IDL
    console.log(`[PolicySync] Adding ${wallet.toBase58()} to whitelist for ${asset.toBase58()}`);
    return "TODO_TX_SIG";
  }

  private async removeFromWhitelist(asset: PublicKey, wallet: PublicKey): Promise<string> {
    // TODO: build and send remove_from_whitelist instruction via Anchor IDL
    console.log(`[PolicySync] Removing ${wallet.toBase58()} from whitelist for ${asset.toBase58()}`);
    return "TODO_TX_SIG";
  }
}
