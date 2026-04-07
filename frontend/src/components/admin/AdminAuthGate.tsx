"use client";

import { useEffect, useState } from "react";
import { useSelectedWalletAccount } from "@solana/react";
import { getAuthToken, authenticate } from "@/lib/auth";

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [account] = useSelectedWalletAccount();
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount or wallet change: check if we already have a valid token
  useEffect(() => {
    if (getAuthToken()) {
      setAuthed(true);
    } else {
      setAuthed(false);
    }
  }, [account?.address]);

  // Auto-auth when wallet connects and no token
  useEffect(() => {
    if (account && !getAuthToken() && !loading) {
      handleAuth();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address]);

  async function handleAuth() {
    if (!account) return;
    setLoading(true);
    setError(null);
    try {
      await authenticate(account);
      setAuthed(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!account) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
          Connect your wallet to access admin
        </p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        {loading ? (
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
            Signing in…
          </p>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
              Sign message to authenticate
            </p>
            {error && (
              <p className="text-xs text-[var(--color-danger)]">{error}</p>
            )}
            <button
              onClick={handleAuth}
              className="px-6 py-3 text-xs font-extrabold uppercase tracking-widest bg-black text-white hover:bg-[var(--color-text-secondary)] transition-colors"
            >
              Sign In
            </button>
          </>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
