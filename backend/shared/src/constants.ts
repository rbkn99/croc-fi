import { PublicKey } from "@solana/web3.js";

export const PROOF_LAYER_PROGRAM_ID = new PublicKey(
  "croZ9hcrqGz3fZHTkBfEaRbZQXkhfW4ZhbVBiFinNrF"
);

export const PROOF_LAYER_HOOK_PROGRAM_ID = new PublicKey(
  "hok77RhLaScwvc4Fsk3EU7DKBzGK1oEeUcMWnodnwQJ"
);

export const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // mainnet USDC
);

export const USDC_DECIMALS = 6;

export const DEFAULT_ATTESTATION_VALIDITY_SECONDS = 24 * 60 * 60; // 24 hours

export const NAV_BPS_SCALE = 10_000; // 10000 = 1.00
export const YIELD_BPS_SCALE = 10_000; // 500 = 5.00%

// Anchor 8-byte discriminator offset
export const ANCHOR_DISCRIMINATOR_SIZE = 8;
