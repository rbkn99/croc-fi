/**
 * Create a mock USDC mint on devnet for testing.
 * Mints 1,000,000 USDC to the admin wallet.
 *
 * Usage: npx tsx scripts/create-devnet-usdc.ts
 */

import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

dotenvConfig({ path: resolve(__dirname, "../.env") });

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getMintLen,
} from "@solana/spl-token";
import { readFileSync, writeFileSync } from "fs";

function loadKeypair(path: string): Keypair {
  const resolved = path.replace("~", process.env.HOME || "");
  const abs = resolve(__dirname, "..", resolved);
  const raw = JSON.parse(readFileSync(abs, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const adminKeyPath = process.env.ISSUER_KEY || "~/.config/solana/id.json";

  const connection = new Connection(rpcUrl, "confirmed");
  const admin = loadKeypair(adminKeyPath);
  const mintKeypair = Keypair.generate();
  const decimals = 6;
  const mintAmount = 1_000_000 * 10 ** decimals; // 1M USDC

  console.log("=== Create Devnet Mock USDC ===\n");
  console.log(`RPC:   ${rpcUrl}`);
  console.log(`Admin: ${admin.publicKey.toBase58()}\n`);

  // Create mint
  const mintLen = getMintLen([]);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

  const ata = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    admin.publicKey
  );

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: admin.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      admin.publicKey,
      null,
      TOKEN_PROGRAM_ID
    ),
    createAssociatedTokenAccountInstruction(
      admin.publicKey,
      ata,
      admin.publicKey,
      mintKeypair.publicKey
    ),
    createMintToInstruction(
      mintKeypair.publicKey,
      ata,
      admin.publicKey,
      mintAmount
    )
  );

  const sig = await sendAndConfirmTransaction(
    connection,
    tx,
    [admin, mintKeypair],
    { commitment: "confirmed" }
  );

  console.log(`Mint:    ${mintKeypair.publicKey.toBase58()}`);
  console.log(`ATA:     ${ata.toBase58()}`);
  console.log(`Amount:  1,000,000 USDC`);
  console.log(`Tx:      ${sig}\n`);

  // Save keypair
  writeFileSync(
    resolve(__dirname, "../devnet-usdc.json"),
    JSON.stringify(Array.from(mintKeypair.secretKey))
  );

  console.log("Keypair saved to devnet-usdc.json");
  console.log(`\nAdd to frontend .env.local:`);
  console.log(`NEXT_PUBLIC_USDC_MINT=${mintKeypair.publicKey.toBase58()}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
