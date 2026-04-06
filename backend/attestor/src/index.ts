import { PublicKey } from "@solana/web3.js";
import { AttestorService } from "./attestor";

const ASSET_PUBKEY = process.env.ASSET_PUBKEY;
const MINT_PUBKEY = process.env.MINT_PUBKEY;

if (!ASSET_PUBKEY || !MINT_PUBKEY) {
  console.error("ASSET_PUBKEY and MINT_PUBKEY env vars are required");
  process.exit(1);
}

const service = new AttestorService();
service.start(new PublicKey(ASSET_PUBKEY), new PublicKey(MINT_PUBKEY));

process.on("SIGINT", () => {
  service.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  service.stop();
  process.exit(0);
});
