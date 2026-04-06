import { Connection, PublicKey, Keypair, Transaction } from "@solana/web3.js";
import {
  AssetRegistry,
  AttestationRecord,
  CreateAssetParams,
  MintParams,
  RedeemParams,
  PROOF_LAYER_PROGRAM_ID,
} from "@prooflayer/shared";

export class ProofLayerClient {
  private connection: Connection;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, "confirmed");
  }

  // --- Read methods ---

  async getAsset(assetPubkey: PublicKey): Promise<AssetRegistry | null> {
    const info = await this.connection.getAccountInfo(assetPubkey);
    if (!info) return null;
    // TODO: deserialize using Anchor IDL
    return null;
  }

  async getAttestation(
    assetPubkey: PublicKey
  ): Promise<AttestationRecord | null> {
    const pda = this.deriveAttestationPda(assetPubkey);
    const info = await this.connection.getAccountInfo(pda);
    if (!info) return null;
    // TODO: deserialize using Anchor IDL
    return null;
  }

  async isWhitelisted(
    asset: PublicKey,
    wallet: PublicKey
  ): Promise<boolean> {
    const pda = this.deriveWhitelistPda(asset, wallet);
    const info = await this.connection.getAccountInfo(pda);
    return info !== null;
  }

  async getAssetHealth(asset: PublicKey): Promise<{
    isActive: boolean;
    isAttestationFresh: boolean;
    navBps: number;
    yieldRateBps: number;
  } | null> {
    const [assetData, attestation] = await Promise.all([
      this.getAsset(asset),
      this.getAttestation(asset),
    ]);
    if (!assetData || !attestation) return null;

    const now = Math.floor(Date.now() / 1000);
    return {
      isActive: assetData.status === "Active",
      isAttestationFresh: attestation.validUntil > now,
      navBps: attestation.navBps,
      yieldRateBps: attestation.yieldRateBps,
    };
  }

  // --- Write methods (return unsigned transactions) ---

  async buildCreateAssetTx(
    params: CreateAssetParams,
    issuer: PublicKey
  ): Promise<Transaction> {
    // TODO: build instruction from Anchor IDL
    const tx = new Transaction();
    console.log(
      `Building createAsset tx: type=${params.assetType}, issuer=${issuer.toBase58()}`
    );
    return tx;
  }

  async buildMintTx(
    params: MintParams,
    user: PublicKey
  ): Promise<Transaction> {
    // TODO: build instruction from Anchor IDL
    const tx = new Transaction();
    console.log(
      `Building mint tx: asset=${params.asset.toBase58()}, amount=${params.usdcAmount}, user=${user.toBase58()}`
    );
    return tx;
  }

  async buildRedeemTx(
    params: RedeemParams,
    user: PublicKey
  ): Promise<Transaction> {
    // TODO: build instruction from Anchor IDL
    const tx = new Transaction();
    console.log(
      `Building redeem tx: asset=${params.asset.toBase58()}, amount=${params.tokenAmount}, user=${user.toBase58()}`
    );
    return tx;
  }

  // --- PDA derivations ---

  deriveAttestationPda(asset: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("attestation"), asset.toBuffer()],
      PROOF_LAYER_PROGRAM_ID
    );
    return pda;
  }

  deriveWhitelistPda(asset: PublicKey, wallet: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), asset.toBuffer(), wallet.toBuffer()],
      PROOF_LAYER_PROGRAM_ID
    );
    return pda;
  }

  deriveIssuancePda(asset: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("issuance"), asset.toBuffer()],
      PROOF_LAYER_PROGRAM_ID
    );
    return pda;
  }
}
