/**
 * Initialize ProofLayer platform config on-chain.
 *
 * Sets up the global PlatformConfig PDA with admin, fee collector, and defaults.
 * Run once after deploying programs.
 *
 * Asset creation, attestation config, and hook init are done via frontend.
 *
 * Reads .env from program/ root.
 *
 * Usage:
 *   npx tsx scripts/init-program.ts [--fee-collector <pubkey>]
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
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { readFileSync } from "fs";

import proofLayerIdl from "../target/idl/proof_layer.json";

// ── Constants from .env ─────────────────────────────────────────

const PROOF_LAYER_PROGRAM_ID = new PublicKey(
  process.env.PROOF_LAYER_PROGRAM_ID || "croZ9hcrqGz3fZHTkBfEaRbZQXkhfW4ZhbVBiFinNrF"
);

// ── CLI args ────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--fee-collector");
  const feeCollector =
    idx !== -1 && idx + 1 < args.length
      ? new PublicKey(args[idx + 1])
      : null;
  return { feeCollector };
}

// ── Helpers ──────────────────────────────────────────────────────

function loadKeypair(path: string): Keypair {
  const resolved = path.replace("~", process.env.HOME || "");
  const abs = resolve(__dirname, "..", resolved);
  const raw = JSON.parse(readFileSync(abs, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  const { feeCollector } = parseArgs();

  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const adminKeyPath = process.env.ISSUER_KEY || "~/.config/solana/id.json";

  const connection = new Connection(rpcUrl, "confirmed");
  const admin = loadKeypair(adminKeyPath);
  const wallet = new Wallet(admin);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  const program = new Program(proofLayerIdl as any, provider);

  const [platformConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform_config")],
    PROOF_LAYER_PROGRAM_ID
  );

  console.log("=== ProofLayer Platform Init ===\n");
  console.log(`RPC:     ${rpcUrl}`);
  console.log(`Admin:   ${admin.publicKey.toBase58()}`);
  console.log(`Program: ${PROOF_LAYER_PROGRAM_ID.toBase58()}\n`);

  const existing = await connection.getAccountInfo(platformConfigPda);
  if (existing) {
    console.log("PlatformConfig already initialized.");
    console.log(`  PDA: ${platformConfigPda.toBase58()}`);
    return;
  }

  const collector = feeCollector || admin.publicKey;

  console.log("Initializing platform config...");

  const sig = await program.methods
    .initializePlatform(collector)
    .accounts({
      admin: admin.publicKey,
      platformConfig: platformConfigPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([admin])
    .rpc();

  console.log(`  PlatformConfig:  ${platformConfigPda.toBase58()}`);
  console.log(`  Admin:           ${admin.publicKey.toBase58()}`);
  console.log(`  Fee Collector:   ${collector.toBase58()}`);
  console.log(`  Tx:              ${sig}\n`);
  console.log("=== Done ===");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
