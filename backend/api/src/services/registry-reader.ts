import { Connection, PublicKey } from "@solana/web3.js";
import {
  AssetRegistry,
  AttestationRecord,
  AssetType,
  AssetStatus,
  PROOF_LAYER_PROGRAM_ID,
  ANCHOR_DISCRIMINATOR_SIZE,
} from "@prooflayer/shared";

const ASSET_TYPE_MAP: AssetType[] = [
  AssetType.Treasury,
  AssetType.CorporateBond,
  AssetType.MoneyMarket,
  AssetType.Commodity,
];

const ASSET_STATUS_MAP: AssetStatus[] = [
  AssetStatus.Active,
  AssetStatus.Paused,
  AssetStatus.Redeemed,
];

export class RegistryReader {
  private connection: Connection;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, "confirmed");
  }

  async getAsset(assetPubkey: PublicKey): Promise<AssetRegistry | null> {
    const accountInfo = await this.connection.getAccountInfo(assetPubkey);
    if (!accountInfo) return null;

    return this.deserializeAsset(accountInfo.data);
  }

  async getAttestation(
    assetPubkey: PublicKey
  ): Promise<AttestationRecord | null> {
    const pda = this.deriveAttestationPda(assetPubkey);
    const accountInfo = await this.connection.getAccountInfo(pda);
    if (!accountInfo) return null;

    return this.deserializeAttestation(accountInfo.data);
  }

  async isWhitelisted(
    assetPubkey: PublicKey,
    wallet: PublicKey
  ): Promise<boolean> {
    const pda = this.deriveWhitelistPda(assetPubkey, wallet);
    const accountInfo = await this.connection.getAccountInfo(pda);
    return accountInfo !== null;
  }

  async getAssetHealth(
    assetPubkey: PublicKey
  ): Promise<{
    isActive: boolean;
    isAttestationFresh: boolean;
    navBps: number;
    yieldRateBps: number;
  } | null> {
    const [asset, attestation] = await Promise.all([
      this.getAsset(assetPubkey),
      this.getAttestation(assetPubkey),
    ]);

    if (!asset || !attestation) return null;

    const now = Math.floor(Date.now() / 1000);

    return {
      isActive: asset.status === AssetStatus.Active,
      isAttestationFresh: attestation.validUntil > now,
      navBps: attestation.navBps,
      yieldRateBps: attestation.yieldRateBps,
    };
  }

  private deriveAttestationPda(asset: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("attestation"), asset.toBuffer()],
      PROOF_LAYER_PROGRAM_ID
    );
    return pda;
  }

  private deriveWhitelistPda(
    asset: PublicKey,
    wallet: PublicKey
  ): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), asset.toBuffer(), wallet.toBuffer()],
      PROOF_LAYER_PROGRAM_ID
    );
    return pda;
  }

  /**
   * Deserialize AssetRegistry from Anchor account data.
   * Layout (after 8-byte discriminator):
   *   issuer: Pubkey (32)
   *   attestor: Pubkey (32)
   *   mint: Pubkey (32)
   *   asset_type: u8 (1) — enum index
   *   status: u8 (1) — enum index
   *   created_at: i64 (8)
   *   bump: u8 (1)
   */
  private deserializeAsset(data: Buffer): AssetRegistry {
    let offset = ANCHOR_DISCRIMINATOR_SIZE;

    const issuer = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;

    const attestor = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;

    // mint (skip — not in our app interface)
    offset += 32;

    const assetTypeIdx = data.readUInt8(offset);
    offset += 1;

    const statusIdx = data.readUInt8(offset);
    offset += 1;

    const createdAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    return {
      issuer,
      attestor,
      assetType: ASSET_TYPE_MAP[assetTypeIdx] ?? AssetType.Treasury,
      status: ASSET_STATUS_MAP[statusIdx] ?? AssetStatus.Active,
      createdAt,
    };
  }

  /**
   * Deserialize AttestationRecord from Anchor account data.
   * Layout (after 8-byte discriminator):
   *   asset: Pubkey (32)
   *   nav_bps: u64 (8)
   *   yield_rate_bps: u64 (8)
   *   proof_hash: [u8; 32]
   *   valid_until: i64 (8)
   *   published_at: i64 (8)
   *   bump: u8 (1)
   */
  private deserializeAttestation(data: Buffer): AttestationRecord {
    let offset = ANCHOR_DISCRIMINATOR_SIZE;

    const asset = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;

    const navBps = Number(data.readBigUInt64LE(offset));
    offset += 8;

    const yieldRateBps = Number(data.readBigUInt64LE(offset));
    offset += 8;

    const proofHash = new Uint8Array(data.subarray(offset, offset + 32));
    offset += 32;

    const validUntil = Number(data.readBigInt64LE(offset));
    offset += 8;

    const publishedAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    return {
      asset,
      navBps,
      yieldRateBps,
      proofHash,
      validUntil,
      attestorSig: new Uint8Array(64), // Not stored on-chain in current program
      publishedAt,
    };
  }
}
