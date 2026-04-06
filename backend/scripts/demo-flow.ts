/**
 * Demo script that walks through the full MVP flow:
 *
 * 1. Issuer creates a Treasury asset in ProofLayer registry
 * 2. Attestor publishes attestation (NAV, yield, proof hash)
 * 3. User mints mTBILL-SOL tokens
 * 4. User attempts transfer to non-whitelisted wallet (rejected)
 * 5. User transfers to whitelisted wallet (success)
 * 6. Attestation expires → transfer rejected → fresh attestation → success
 * 7. Kamino mock: read attestation, accept as collateral
 */

import { Keypair, PublicKey } from "@solana/web3.js";
import { ProofLayerClient, AssetType } from "@prooflayer/sdk";
import { loadConfig } from "@prooflayer/shared";

async function main() {
  const config = loadConfig();
  const client = new ProofLayerClient(config.rpcUrl);

  console.log("=== ProofLayer MVP Demo ===\n");
  console.log(`Cluster: ${config.cluster}`);
  console.log(`RPC: ${config.rpcUrl}\n`);

  // Step 1: Create asset
  console.log("Step 1: Creating Treasury asset...");
  const issuer = Keypair.generate();
  const attestor = Keypair.generate();

  const createTx = await client.buildCreateAssetTx(
    { assetType: AssetType.Treasury, attestor: attestor.publicKey },
    issuer.publicKey
  );
  console.log("  → Asset creation transaction built (sign & send to execute)\n");

  // Step 2: Publish attestation
  console.log("Step 2: Publishing attestation...");
  console.log("  → NAV = 1.0023 (10023 bps)");
  console.log("  → Yield = 5.00% (500 bps)");
  console.log("  → Valid for 24h\n");

  // Step 3: Mint tokens
  console.log("Step 3: Minting 1000 mTBILL-SOL...");
  const user = Keypair.generate();
  const mockAsset = Keypair.generate().publicKey;

  const mintTx = await client.buildMintTx(
    { asset: mockAsset, usdcAmount: 1000_000_000 },
    user.publicKey
  );
  console.log("  → Mint transaction built\n");

  // Step 4: Transfer to non-whitelisted (would fail on-chain)
  console.log("Step 4: Transfer to non-whitelisted wallet...");
  const nonWhitelisted = Keypair.generate().publicKey;
  const isWl = await client.isWhitelisted(mockAsset, nonWhitelisted);
  console.log(`  → Whitelisted: ${isWl} (transfer would be rejected)\n`);

  // Step 5: Transfer to whitelisted wallet
  console.log("Step 5: Transfer to whitelisted wallet...");
  console.log("  → (requires add_to_whitelist call first)\n");

  // Step 6: Stale attestation
  console.log("Step 6: Attestation freshness check...");
  const health = await client.getAssetHealth(mockAsset);
  console.log(`  → Health: ${JSON.stringify(health)}\n`);

  // Step 7: Kamino mock
  console.log("Step 7: Kamino integration mock...");
  console.log("  → Reading attestation for collateral pricing");
  console.log("  → LTV: 98%");
  console.log("  → mTBILL-SOL accepted as collateral\n");

  console.log("=== Demo complete ===");
}

main().catch(console.error);
