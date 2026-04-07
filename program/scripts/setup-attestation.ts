/**
 * Set up attestation for an asset so mint_rwa_token works.
 *
 * 1. init_attestation_config (issuer = attestor, threshold = 1)
 * 2. submit_nav_vote (NAV = 10000 bps = $1.00)
 * 3. finalize_attestation
 *
 * Usage: npx tsx scripts/setup-attestation.ts <RWA_MINT>
 */

import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
dotenvConfig({ path: resolve(__dirname, "../.env") });

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { AnchorProvider, Program, Wallet, BN } from "@coral-xyz/anchor";
import { readFileSync } from "fs";

import proofLayerIdl from "../target/idl/proof_layer.json";

const PROOF_LAYER_PROGRAM_ID = new PublicKey(
  process.env.PROOF_LAYER_PROGRAM_ID || "croZ9hcrqGz3fZHTkBfEaRbZQXkhfW4ZhbVBiFinNrF"
);

function loadKeypair(path: string): Keypair {
  const resolved = path.replace("~", process.env.HOME || "");
  const abs = resolve(__dirname, "..", resolved);
  const raw = JSON.parse(readFileSync(abs, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function findPda(seeds: Buffer[]): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(seeds, PROOF_LAYER_PROGRAM_ID);
}

async function main() {
  const rwaMint = new PublicKey(process.argv[2]);
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const issuer = loadKeypair(process.env.ISSUER_KEY || "~/.config/solana/id.json");

  const connection = new Connection(rpcUrl, "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(issuer), { commitment: "confirmed" });
  const program = new Program(proofLayerIdl as any, provider);

  const [assetRegistry] = findPda([Buffer.from("asset"), rwaMint.toBuffer()]);
  const [attestationConfig] = findPda([Buffer.from("attestation_config"), assetRegistry.toBuffer()]);
  const [attestation] = findPda([Buffer.from("attestation"), assetRegistry.toBuffer()]);

  console.log("=== Setup Attestation ===\n");
  console.log(`RWA Mint:           ${rwaMint.toBase58()}`);
  console.log(`Asset Registry:     ${assetRegistry.toBase58()}`);
  console.log(`Attestation Config: ${attestationConfig.toBase58()}`);
  console.log(`Attestation:        ${attestation.toBase58()}`);
  console.log(`Issuer:             ${issuer.publicKey.toBase58()}\n`);

  // Step 1: init_attestation_config (issuer is the single attestor)
  const configExists = await connection.getAccountInfo(attestationConfig);
  if (configExists) {
    console.log("Step 1: AttestationConfig already exists, skipping.\n");
  } else {
    console.log("Step 1: Initializing attestation config...");
    const sig1 = await program.methods
      .initAttestationConfig(
        [issuer.publicKey],  // attestors
        1,                   // threshold
        1000,                // tolerance_bps (10%)
        new BN(86400 * 365), // validity_duration (1 year)
      )
      .accounts({
        issuer: issuer.publicKey,
        assetRegistry,
        attestationConfig,
        systemProgram: SystemProgram.programId,
      })
      .signers([issuer])
      .rpc();
    console.log(`  Tx: ${sig1}\n`);
  }

  // Step 2: submit_nav_vote
  // Need to read current round from config
  const configData = await program.account.attestationConfig.fetch(attestationConfig);
  const currentRound = (configData as any).currentRound as number;
  console.log(`Step 2: Submitting NAV vote (round ${currentRound})...`);

  const [votePda] = findPda([
    Buffer.from("vote"),
    attestationConfig.toBuffer(),
    Buffer.from(new BN(currentRound).toArray("le", 8)),
    issuer.publicKey.toBuffer(),
  ]);

  const proofHash = Buffer.alloc(32);
  Buffer.from("demo-attestation").copy(proofHash);

  const sig2 = await program.methods
    .submitNavVote(
      new BN(10000), // nav_bps = $1.00
      new BN(500),   // yield_rate_bps = 5%
      Array.from(proofHash),
    )
    .accounts({
      attestor: issuer.publicKey,
      attestationConfig,
      attestationVote: votePda,
      systemProgram: SystemProgram.programId,
    })
    .signers([issuer])
    .rpc();
  console.log(`  Vote PDA: ${votePda.toBase58()}`);
  console.log(`  Tx: ${sig2}\n`);

  // Step 3: finalize_attestation
  console.log("Step 3: Finalizing attestation...");
  const sig3 = await program.methods
    .finalizeAttestation()
    .accounts({
      payer: issuer.publicKey,
      assetRegistry,
      attestationConfig,
      attestation,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts([
      { pubkey: votePda, isWritable: false, isSigner: false },
    ])
    .signers([issuer])
    .rpc();
  console.log(`  Tx: ${sig3}\n`);

  console.log("=== Done! Attestation is live. Minting should work now. ===");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
