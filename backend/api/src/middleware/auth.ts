import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import nacl from "tweetnacl";
import { randomBytes } from "crypto";
import { PublicKey } from "@solana/web3.js";
import { prisma } from "@prooflayer/shared";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const JWT_EXPIRY = "24h";

// In-memory nonce store with TTL (5 min)
const nonceStore = new Map<string, { nonce: string; createdAt: number }>();
const NONCE_TTL_MS = 5 * 60 * 1000;

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      wallet?: string;
      institutionId?: string;
      institutionRole?: string;
    }
  }
}

export function generateChallenge(wallet: string): string {
  // Clean expired nonces
  const now = Date.now();
  for (const [key, val] of nonceStore) {
    if (now - val.createdAt > NONCE_TTL_MS) nonceStore.delete(key);
  }

  const nonce = randomBytes(32).toString("hex");
  nonceStore.set(wallet, { nonce, createdAt: now });
  return nonce;
}

export function verifyAndIssueToken(
  wallet: string,
  signature: string,
  nonce: string
): string | null {
  const stored = nonceStore.get(wallet);
  if (!stored || stored.nonce !== nonce) return null;
  if (Date.now() - stored.createdAt > NONCE_TTL_MS) {
    nonceStore.delete(wallet);
    return null;
  }

  try {
    const message = new TextEncoder().encode(
      `Sign this message to authenticate with ProofLayer:\n${nonce}`
    );
    const pubkey = new PublicKey(wallet);
    const sig = Buffer.from(signature, "base64");

    const valid = nacl.sign.detached.verify(message, sig, pubkey.toBytes());
    if (!valid) return null;

    nonceStore.delete(wallet);
    return jwt.sign({ wallet }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { wallet: string };
    req.wallet = payload.wallet;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireIssuer(req: Request, res: Response, next: NextFunction): void {
  const issuerPubkey = process.env.ISSUER_PUBKEY;
  if (!issuerPubkey) {
    // TODO: re-enable after hackathon — skip issuer check if not configured
    next();
    return;
  }
  if (req.wallet !== issuerPubkey) {
    res.status(403).json({ error: "Issuer access required" });
    return;
  }
  next();
}

export async function requireInstitution(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.wallet) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const member = await prisma.institutionMember.findUnique({
    where: { wallet: req.wallet },
    include: { institution: true },
  });

  // Also check if wallet is the institution's primary wallet
  const institution = member?.institution ?? await prisma.institution.findUnique({
    where: { wallet: req.wallet },
  });

  if (!institution) {
    res.status(403).json({ error: "Institution access required" });
    return;
  }

  req.institutionId = institution.id;
  req.institutionRole = member?.role ?? "admin";
  next();
}
