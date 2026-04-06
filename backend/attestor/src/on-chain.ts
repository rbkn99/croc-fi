import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  PublishAttestationParams,
  PROOF_LAYER_PROGRAM_ID,
} from "@prooflayer/shared";

export class OnChainClient {
  private connection: Connection;
  private attestorKeypair: Keypair;

  constructor(rpcUrl: string, attestorKeypair: Keypair) {
    this.connection = new Connection(rpcUrl, "confirmed");
    this.attestorKeypair = attestorKeypair;
  }

  async publishAttestation(params: PublishAttestationParams): Promise<string> {
    // TODO: build actual instruction from IDL after program deployment
    // This is a placeholder showing the transaction structure

    const ix = {
      programId: PROOF_LAYER_PROGRAM_ID,
      keys: [
        { pubkey: params.asset, isSigner: false, isWritable: true },
        {
          pubkey: this.attestorKeypair.publicKey,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: this.deriveAttestationPda(params.asset),
          isSigner: false,
          isWritable: true,
        },
      ],
      data: this.serializePublishAttestationData(params),
    };

    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(this.connection, tx, [
      this.attestorKeypair,
    ]);

    return sig;
  }

  async updateInterestRate(
    mint: PublicKey,
    newRateBps: number
  ): Promise<string> {
    // TODO: call Token-2022 updateRate instruction via @solana/spl-token
    // Placeholder for the InterestBearingMint rate update

    console.log(
      `Updating interest rate for mint ${mint.toBase58()} to ${newRateBps} bps`
    );

    return "TODO_TX_SIGNATURE";
  }

  private deriveAttestationPda(asset: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("attestation"), asset.toBuffer()],
      PROOF_LAYER_PROGRAM_ID
    );
    return pda;
  }

  private serializePublishAttestationData(
    params: PublishAttestationParams
  ): Buffer {
    // TODO: use Anchor IDL-based serialization after program deployment
    const buf = Buffer.alloc(128);
    let offset = 0;

    buf.writeBigUInt64LE(BigInt(params.navBps), offset);
    offset += 8;
    buf.writeBigUInt64LE(BigInt(params.yieldRateBps), offset);
    offset += 8;
    params.proofHash.copy(buf, offset);
    offset += 32;
    buf.writeBigInt64LE(BigInt(params.validityWindowSeconds), offset);
    offset += 8;

    return buf.subarray(0, offset);
  }
}
