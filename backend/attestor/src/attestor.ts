import { Keypair, PublicKey } from "@solana/web3.js";
import { readFileSync } from "fs";
import {
  loadConfig,
  DEFAULT_ATTESTATION_VALIDITY_SECONDS,
} from "@prooflayer/shared";
import { fetchYieldRate } from "./yield-source";
import { computeNav, fetchCustodianData } from "./nav-calculator";
import { hashProofDocument, ProofDocument } from "./proof-hasher";
import { OnChainClient } from "./on-chain";

export class AttestorService {
  private config = loadConfig();
  private onChain: OnChainClient;
  private attestorKeypair: Keypair;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const keyData = JSON.parse(
      readFileSync(this.config.attestorKeyPath, "utf-8")
    );
    this.attestorKeypair = Keypair.fromSecretKey(Uint8Array.from(keyData));
    this.onChain = new OnChainClient(
      this.config.rpcUrl,
      this.attestorKeypair
    );
  }

  async publishAttestation(
    asset: PublicKey,
    mint: PublicKey
  ): Promise<string> {
    console.log(`Publishing attestation for asset ${asset.toBase58()}...`);

    const [yieldData, custodianData] = await Promise.all([
      fetchYieldRate(),
      fetchCustodianData(),
    ]);

    const navBps = computeNav(custodianData);

    const proofDoc: ProofDocument = {
      custodianName: "mock-custodian",
      documentUrl: "https://example.com/proof/latest.pdf",
      documentHash: "placeholder",
      timestamp: Date.now(),
    };
    const proofHash = hashProofDocument(proofDoc);

    const sig = await this.onChain.publishAttestation({
      asset,
      navBps,
      yieldRateBps: yieldData.rateBps,
      proofHash,
      validityWindowSeconds: DEFAULT_ATTESTATION_VALIDITY_SECONDS,
    });

    console.log(`Attestation published: ${sig}`);

    await this.onChain.updateInterestRate(mint, yieldData.rateBps);
    console.log(
      `InterestBearingMint rate updated to ${yieldData.rateBps} bps`
    );

    return sig;
  }

  start(asset: PublicKey, mint: PublicKey): void {
    console.log(
      `Attestor service started. Interval: ${this.config.attestationIntervalMs}ms`
    );

    this.publishAttestation(asset, mint).catch(console.error);

    this.intervalHandle = setInterval(() => {
      this.publishAttestation(asset, mint).catch(console.error);
    }, this.config.attestationIntervalMs);
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log("Attestor service stopped.");
    }
  }
}
