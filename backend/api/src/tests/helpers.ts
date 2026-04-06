import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const ISSUER_WALLET = "TestIssuerPubkeyForTests1111111111111111111";

// Set ISSUER_PUBKEY for tests so requireIssuer middleware passes
process.env.ISSUER_PUBKEY = ISSUER_WALLET;

export function issuerToken(): string {
  return jwt.sign({ wallet: ISSUER_WALLET }, JWT_SECRET, { expiresIn: "1h" });
}

export function randomWalletToken(wallet: string): string {
  return jwt.sign({ wallet }, JWT_SECRET, { expiresIn: "1h" });
}
