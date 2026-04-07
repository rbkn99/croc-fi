"use client";

import { getWalletFeature } from "@wallet-standard/ui";
import { SolanaSignMessage } from "@solana/wallet-standard-features";
import { getWalletAccountForUiWalletAccount_DO_NOT_USE_OR_YOU_WILL_BE_FIRED } from "@wallet-standard/ui-registry";
import type { UiWalletAccount } from "@wallet-standard/ui";

const TOKEN_KEY = "pl_auth_token";

// Module-level cache so client.ts doesn't hit localStorage on every request
let _cached: string | null = null;

export function getAuthToken(): string | null {
  if (_cached) return _cached;
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored) _cached = stored;
  return stored;
}

export function setAuthToken(token: string): void {
  _cached = token;
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  _cached = null;
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Full challenge → sign → verify auth flow.
 * Calls POST /auth/challenge, signs with the wallet's SolanaSignMessage feature,
 * then calls POST /auth/verify and stores the JWT.
 */
export async function authenticate(uiAccount: UiWalletAccount): Promise<void> {
  // 1. Get challenge nonce
  const challengeRes = await fetch(`${API_BASE}/api/v1/auth/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet: uiAccount.address }),
  });
  if (!challengeRes.ok) throw new Error("Failed to get auth challenge");
  const { nonce, message } = (await challengeRes.json()) as { nonce: string; message: string };

  // 2. Sign the message using the wallet's SolanaSignMessage feature
  const underlyingAccount =
    getWalletAccountForUiWalletAccount_DO_NOT_USE_OR_YOU_WILL_BE_FIRED(uiAccount);
  const feature = getWalletFeature(uiAccount, SolanaSignMessage) as {
    signMessage: (
      ...inputs: { account: typeof underlyingAccount; message: Uint8Array }[]
    ) => Promise<readonly { signedMessage: Uint8Array; signature: Uint8Array }[]>;
  };
  const messageBytes = new TextEncoder().encode(message);
  const [result] = await feature.signMessage({ account: underlyingAccount, message: messageBytes });
  const signature = Buffer.from(result.signature).toString("base64");

  // 3. Exchange signature for JWT
  const verifyRes = await fetch(`${API_BASE}/api/v1/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet: uiAccount.address, signature, nonce }),
  });
  if (!verifyRes.ok) throw new Error("Auth verification failed");
  const { token } = (await verifyRes.json()) as { token: string };

  setAuthToken(token);
}
