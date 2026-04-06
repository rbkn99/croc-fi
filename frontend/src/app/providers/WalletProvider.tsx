"use client";

import { ReactNode } from "react";
import { SelectedWalletAccountContextProvider } from "@solana/react";

const STORAGE_KEY = "proof-layer-wallet";

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <SelectedWalletAccountContextProvider
      filterWallets={() => true}
      stateSync={{
        getSelectedWallet: () =>
          typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null,
        storeSelectedWallet: (k) =>
          typeof window !== "undefined" && localStorage.setItem(STORAGE_KEY, k),
        deleteSelectedWallet: () =>
          typeof window !== "undefined" && localStorage.removeItem(STORAGE_KEY),
      }}
    >
      {children}
    </SelectedWalletAccountContextProvider>
  );
}
