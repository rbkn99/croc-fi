/**
 * Setup script for local development:
 * - Generates keypairs for issuer and attestor
 * - Airdrops SOL on devnet/localnet
 * - Creates initial asset and whitelist entries
 */

import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { loadConfig } from "@prooflayer/shared";

const KEYS_DIR = "./.keys";

async function main() {
  const config = loadConfig();
  const connection = new Connection(config.rpcUrl, "confirmed");

  if (!existsSync(KEYS_DIR)) {
    mkdirSync(KEYS_DIR, { recursive: true });
  }

  console.log("Generating keypairs...");

  const issuer = Keypair.generate();
  const attestor = Keypair.generate();
  const user = Keypair.generate();

  writeFileSync(
    `${KEYS_DIR}/issuer.json`,
    JSON.stringify(Array.from(issuer.secretKey))
  );
  writeFileSync(
    `${KEYS_DIR}/attestor.json`,
    JSON.stringify(Array.from(attestor.secretKey))
  );
  writeFileSync(
    `${KEYS_DIR}/user.json`,
    JSON.stringify(Array.from(user.secretKey))
  );

  console.log(`Issuer:   ${issuer.publicKey.toBase58()}`);
  console.log(`Attestor: ${attestor.publicKey.toBase58()}`);
  console.log(`User:     ${user.publicKey.toBase58()}`);

  if (config.cluster === "devnet") {
    console.log("\nRequesting airdrops...");
    for (const kp of [issuer, attestor, user]) {
      const sig = await connection.requestAirdrop(
        kp.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(sig);
      console.log(`  Airdropped 2 SOL to ${kp.publicKey.toBase58()}`);
    }
  }

  console.log("\nSetup complete. Keys saved to .keys/");
}

main().catch(console.error);
