"use client";

import { ReactNode } from "react";
import { WalletProvider } from "./WalletProvider";
import { QueryProvider } from "./QueryProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <WalletProvider>{children}</WalletProvider>
    </QueryProvider>
  );
}
