"use client";

import { useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelectedWalletAccount } from "@solana/react";
import { getWalletAccountForUiWalletAccount_DO_NOT_USE_OR_YOU_WILL_BE_FIRED } from "@wallet-standard/ui-registry";
import { getWalletFeature } from "@wallet-standard/ui";
import { SolanaSignAndSendTransaction } from "@solana/wallet-standard-features";
import {
  address,
  createSolanaRpc,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructions,
  signAndSendTransactionMessageWithSigners,
  generateKeyPairSigner,
  getTransactionEncoder,
  type TransactionSendingSigner,
} from "@solana/kit";
import { getRpcUrl, getSolanaChain } from "./client";
import { buildCreateMintInstructions, getMintRentLamports } from "./createMint";
import { findAssetRegistryPda } from "./generated/src/generated/pdas";
import {
  PROOF_LAYER_PROGRAM_ADDRESS,
  getCreateAssetInstructionAsync,
  getPauseAssetInstruction,
  getResumeAssetInstruction,
  getAddToWhitelistInstructionAsync,
  getRemoveFromWhitelistInstruction,
  getMintRwaTokenInstructionAsync,
  getRedeemRwaTokenInstructionAsync,
  getFulfillRedemptionInstructionAsync,
  getRejectRedemptionInstructionAsync,
  getWithdrawFromVaultInstructionAsync,
  getDepositToVaultInstructionAsync,
  getInitAttestationConfigInstructionAsync,
} from "./program";
import {
  getAssetRegistryDecoder,
  ASSET_REGISTRY_DISCRIMINATOR,
} from "./generated/src/generated/accounts/assetRegistry";
import {
  getAttestationRecordDecoder,
  ATTESTATION_RECORD_DISCRIMINATOR,
} from "./generated/src/generated/accounts/attestationRecord";
import {
  getWhitelistEntryDecoder,
  WHITELIST_ENTRY_DISCRIMINATOR,
} from "./generated/src/generated/accounts/whitelistEntry";
import {
  getRedemptionRequestDecoder,
  REDEMPTION_REQUEST_DISCRIMINATOR,
} from "./generated/src/generated/accounts/redemptionRequest";
import { AssetType } from "./generated/src/generated/types/assetType";
import { AssetStatus } from "./generated/src/generated/types/assetStatus";


// ── Mapped types (on-chain → UI) ───────────────────────────

export interface MappedAsset {
  pubkey: string;
  mint: string;
  issuer: string;
  name: string;
  assetType: string;
  status: string;
  createdAt: number;
  minMintAmount: number;
  minRedeemAmount: number;
  dailyMintLimit: number;
  dailyRedeemLimit: number;
  dailyMinted: number;
  dailyRedeemed: number;
}

export interface MappedAttestation {
  pubkey: string;
  assetPubkey: string;
  navBps: number;
  yieldRateBps: number;
  proofHash: string;
  validUntil: number;
  publishedAt: number;
}

export interface MappedWhitelist {
  pubkey: string;
  assetPubkey: string;
  wallet: string;
  addedAt: number;
}

export interface MappedRedemptionRequest {
  pubkey: string;
  assetPubkey: string;
  user: string;
  amount: number;
  requestedAt: number;
}

// ── Helpers ────────────────────────────────────────────────

function getRpc() {
  return createSolanaRpc(getRpcUrl());
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchGpaAccounts(discriminator: Uint8Array): Promise<Array<{ address: string; data: Uint8Array }>> {
  const rpc = getRpc();
  const base64Disc = btoa(String.fromCharCode(...discriminator));
  const result: any[] = await rpc
    .getProgramAccounts(address(PROOF_LAYER_PROGRAM_ADDRESS), {
      encoding: "base64" as any,
      filters: [
        {
          memcmp: {
            offset: 0n,
            bytes: base64Disc as any,
            encoding: "base64" as any,
          },
        },
      ],
    })
    .send() as any;
  return result.map((item) => ({
    address: String(item.pubkey),
    data: Uint8Array.from(atob(item.account.data[0] as string), (c: string) => c.charCodeAt(0)),
  }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function sendInstruction(
  signer: TransactionSendingSigner,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instruction: any
) {
  const rpc = getRpc();
  const { value: blockhash } = await rpc.getLatestBlockhash().send();
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(signer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstruction(instruction, m)
  );
  return signAndSendTransactionMessageWithSigners(message);
}

// ── Query hooks ─────────────────────────────────────────────

export function useAssets() {
  return useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const raw = await fetchGpaAccounts(ASSET_REGISTRY_DISCRIMINATOR);
      const decoder = getAssetRegistryDecoder();
      return raw.map((item) => {
        const decoded = decoder.decode(item.data);
        return {
          pubkey: String(item.address),
          mint: String(decoded.mint),
          issuer: String(decoded.issuer),
          name: String(decoded.mint).slice(0, 8),
          assetType: AssetType[decoded.assetType],
          status: AssetStatus[decoded.status].toLowerCase(),
          createdAt: Number(decoded.createdAt),
          minMintAmount: Number(decoded.minMintAmount),
          minRedeemAmount: Number(decoded.minRedeemAmount),
          dailyMintLimit: Number(decoded.dailyMintLimit),
          dailyRedeemLimit: Number(decoded.dailyRedeemLimit),
          dailyMinted: Number(decoded.dailyMinted),
          dailyRedeemed: Number(decoded.dailyRedeemed),
        };
      });
    },
    staleTime: 10_000,
  });
}

export function useAsset(pubkey: string) {
  const { data: assets } = useAssets();
  return assets?.find((a) => a.pubkey === pubkey) ?? null;
}

export function useAttestations() {
  return useQuery({
    queryKey: ["attestations"],
    queryFn: async () => {
      const raw = await fetchGpaAccounts(ATTESTATION_RECORD_DISCRIMINATOR);
      const decoder = getAttestationRecordDecoder();
      return raw.map((item) => {
        const decoded = decoder.decode(item.data);
        return {
          pubkey: String(item.address),
          assetPubkey: String(decoded.asset),
          navBps: Number(decoded.navBps),
          yieldRateBps: Number(decoded.yieldRateBps),
          proofHash: Array.from(decoded.proofHash)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(""),
          validUntil: Number(decoded.validUntil),
          publishedAt: Number(decoded.publishedAt),
        };
      });
    },
    staleTime: 10_000,
  });
}

export function useWhitelist() {
  return useQuery({
    queryKey: ["whitelist"],
    queryFn: async () => {
      const raw = await fetchGpaAccounts(WHITELIST_ENTRY_DISCRIMINATOR);
      const decoder = getWhitelistEntryDecoder();
      return raw.map((item) => {
        const decoded = decoder.decode(item.data);
        return {
          pubkey: String(item.address),
          assetPubkey: String(decoded.asset),
          wallet: String(decoded.wallet),
          addedAt: Number(decoded.addedAt),
        };
      });
    },
    staleTime: 10_000,
  });
}

export function useRedemptionRequests() {
  return useQuery({
    queryKey: ["redemptionRequests"],
    queryFn: async () => {
      const raw = await fetchGpaAccounts(REDEMPTION_REQUEST_DISCRIMINATOR);
      const decoder = getRedemptionRequestDecoder();
      return raw.map((item) => {
        const decoded = decoder.decode(item.data);
        return {
          pubkey: String(item.address),
          assetPubkey: String(decoded.asset),
          user: String(decoded.user),
          amount: Number(decoded.amount),
          requestedAt: Number(decoded.requestedAt),
        };
      });
    },
    staleTime: 10_000,
  });
}

// ── Signer hook ─────────────────────────────────────────────

function useWalletSigner() {
  const [account] = useSelectedWalletAccount();
  const chain = getSolanaChain();
  // Keep a ref so the signer closure always has access to the latest account
  // without needing to be rebuilt on every render.
  const accountRef = useRef(account);
  accountRef.current = account;

  const signer = useMemo((): TransactionSendingSigner | null => {
    if (!account) return null;
    // Build a signer that defers the wallet-registry lookup to call-time
    // (inside the async function), so it never runs during React render and
    // therefore never throws for unregistered dummy accounts.
    const accountAddress = address(account.address);
    return {
      address: accountAddress,
      signAndSendTransactions: async (transactions, config = {}) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { abortSignal } = config as { abortSignal?: AbortSignal };
        abortSignal?.throwIfAborted();
        if (transactions.length === 0) return Object.freeze([]);
        if (transactions.length > 1) throw new Error("Wallet multisign not supported");

        const currentAccount = accountRef.current;
        if (!currentAccount) throw new Error("Wallet disconnected");

        // Registry lookup is safe here — currentAccount is a real UiWalletAccount.
        const underlyingAccount =
          getWalletAccountForUiWalletAccount_DO_NOT_USE_OR_YOU_WILL_BE_FIRED(currentAccount);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const feature = getWalletFeature(currentAccount, SolanaSignAndSendTransaction) as any;

        const encoder = getTransactionEncoder();
        const wireBytes = encoder.encode(transactions[0]);

        const results = await feature.signAndSendTransaction({
          account: underlyingAccount,
          chain,
          transaction: wireBytes,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return Object.freeze([(results as any)[0].signature]);
      },
    };
    // Rebuild only when the connected address or chain changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address, chain]);

  return { account, signer };
}

// ── Mutation hooks ──────────────────────────────────────────

export function useCreateAsset() {
  const { account, signer } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetType,
      minMintAmount,
      minRedeemAmount,
      dailyMintLimit,
      dailyRedeemLimit,
    }: {
      assetType: string;
      minMintAmount?: number;
      minRedeemAmount?: number;
      dailyMintLimit?: number;
      dailyRedeemLimit?: number;
    }) => {
      if (!account || !signer) throw new Error("Wallet not connected");

      const rpc = getRpc();
      const mintKeypair = await generateKeyPairSigner();
      const mintAddress = mintKeypair.address;

      // Derive asset registry PDA (will be mint authority)
      const assetRegistryAddress = await findAssetRegistryPda({ rwaMint: mintAddress });

      // Get rent
      const lamports = await getMintRentLamports(rpc);

      // Build mint creation instructions
      const mintIxs = buildCreateMintInstructions({
        payer: signer,
        mintKeypair,
        mintAuthority: assetRegistryAddress[0],
        decimals: 6,
        lamports,
      });

      // Build create_asset instruction
      const typeMap: Record<string, AssetType> = {
        Treasury: AssetType.Treasury,
        CorporateBond: AssetType.CorporateBond,
        MoneyMarket: AssetType.MoneyMarket,
        Commodity: AssetType.Commodity,
      };
      const createAssetIx = await getCreateAssetInstructionAsync({
        issuer: signer,
        rwaMint: mintAddress,
        assetType: typeMap[assetType] ?? AssetType.Treasury,
        minMintAmount: BigInt(minMintAmount ?? 0),
        minRedeemAmount: BigInt(minRedeemAmount ?? 0),
        dailyMintLimit: BigInt(dailyMintLimit ?? 0),
        dailyRedeemLimit: BigInt(dailyRedeemLimit ?? 0),
      });

      // Send as single transaction
      const { value: blockhash } = await rpc.getLatestBlockhash().send();
      const message = pipe(
        createTransactionMessage({ version: 0 }),
        (m) => setTransactionMessageFeePayerSigner(signer, m),
        (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
        (m) => appendTransactionMessageInstructions([...mintIxs, createAssetIx], m),
      );
      return signAndSendTransactionMessageWithSigners(message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useTogglePause() {
  const { account, signer } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetRegistryPubkey,
      currentStatus,
    }: {
      assetRegistryPubkey: string;
      currentStatus: string;
    }) => {
      if (!account || !signer) throw new Error("Wallet not connected");
      const ix =
        currentStatus === "paused"
          ? getResumeAssetInstruction({
              issuer: signer,
              assetRegistry: address(assetRegistryPubkey),
            })
          : getPauseAssetInstruction({
              issuer: signer,
              assetRegistry: address(assetRegistryPubkey),
            });
      return sendInstruction(signer, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useAddToWhitelist() {
  const { account, signer } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetRegistryPubkey,
      walletAddress,
    }: {
      assetRegistryPubkey: string;
      walletAddress: string;
    }) => {
      if (!account || !signer) throw new Error("Wallet not connected");
      const ix = await getAddToWhitelistInstructionAsync({
        issuer: signer,
        assetRegistry: address(assetRegistryPubkey),
        wallet: address(walletAddress),
      });
      return sendInstruction(signer, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whitelist"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useRemoveFromWhitelist() {
  const { account, signer } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetRegistryPubkey,
      whitelistEntryPubkey,
    }: {
      assetRegistryPubkey: string;
      whitelistEntryPubkey: string;
    }) => {
      if (!account || !signer) throw new Error("Wallet not connected");
      const ix = getRemoveFromWhitelistInstruction({
        issuer: signer,
        assetRegistry: address(assetRegistryPubkey),
        whitelistEntry: address(whitelistEntryPubkey),
      });
      return sendInstruction(signer, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whitelist"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

// ── Attestation Config ─────────────────────────────────────

export function useInitAttestationConfig() {
  const { account, signer } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetRegistryPubkey,
      attestors,
      threshold,
      toleranceBps,
      validityDuration,
    }: {
      assetRegistryPubkey: string;
      attestors: string[];
      threshold: number;
      toleranceBps: number;
      validityDuration: bigint;
    }) => {
      if (!account || !signer) throw new Error("Wallet not connected");
      const ix = await getInitAttestationConfigInstructionAsync({
        issuer: signer,
        assetRegistry: address(assetRegistryPubkey),
        attestors: attestors.map((a) => address(a)),
        threshold,
        toleranceBps,
        validityDuration,
      });
      return sendInstruction(signer, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

// ── Mint & Redeem ──────────────────────────────────────────

export function useMintRwaToken() {
  const { account, signer } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rwaMint,
      usdcMint,
      usdcAmount,
    }: {
      rwaMint: string;
      usdcMint: string;
      usdcAmount: bigint;
    }) => {
      if (!account || !signer) throw new Error("Wallet not connected");
      const ix = await getMintRwaTokenInstructionAsync({
        user: signer,
        rwaMint: address(rwaMint),
        usdcMint: address(usdcMint),
        usdcAmount,
      });
      return sendInstruction(signer, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useRedeemRwaToken() {
  const { account, signer } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rwaMint,
      amount,
    }: {
      rwaMint: string;
      amount: bigint;
    }) => {
      if (!account || !signer) throw new Error("Wallet not connected");
      const ix = await getRedeemRwaTokenInstructionAsync({
        user: signer,
        rwaMint: address(rwaMint),
        amount,
      });
      return sendInstruction(signer, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["redemptionRequests"] });
    },
  });
}

// ── Issuer: Redemption management ──────────────────────────

export function useFulfillRedemption() {
  const { account, signer } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rwaMint,
      usdcMint,
      userPubkey,
      redemptionRequestPubkey,
    }: {
      rwaMint: string;
      usdcMint: string;
      userPubkey: string;
      redemptionRequestPubkey: string;
    }) => {
      if (!account || !signer) throw new Error("Wallet not connected");
      const ix = await getFulfillRedemptionInstructionAsync({
        issuer: signer,
        redemptionRequest: address(redemptionRequestPubkey),
        rwaMint: address(rwaMint),
        usdcMint: address(usdcMint),
        user: address(userPubkey),
      });
      return sendInstruction(signer, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["redemptionRequests"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useRejectRedemption() {
  const { account, signer } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rwaMint,
      userPubkey,
      redemptionRequestPubkey,
    }: {
      rwaMint: string;
      userPubkey: string;
      redemptionRequestPubkey: string;
    }) => {
      if (!account || !signer) throw new Error("Wallet not connected");
      const ix = await getRejectRedemptionInstructionAsync({
        issuer: signer,
        redemptionRequest: address(redemptionRequestPubkey),
        rwaMint: address(rwaMint),
        user: address(userPubkey),
      });
      return sendInstruction(signer, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["redemptionRequests"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

// ── Issuer: Vault management ───────────────────────────────

export function useWithdrawFromVault() {
  const { account, signer } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rwaMint,
      usdcMint,
      amount,
    }: {
      rwaMint: string;
      usdcMint: string;
      amount: bigint;
    }) => {
      if (!account || !signer) throw new Error("Wallet not connected");
      const ix = await getWithdrawFromVaultInstructionAsync({
        issuer: signer,
        rwaMint: address(rwaMint),
        usdcMint: address(usdcMint),
        amount,
      });
      return sendInstruction(signer, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useDepositToVault() {
  const { account, signer } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rwaMint,
      usdcMint,
      amount,
    }: {
      rwaMint: string;
      usdcMint: string;
      amount: bigint;
    }) => {
      if (!account || !signer) throw new Error("Wallet not connected");
      const ix = await getDepositToVaultInstructionAsync({
        issuer: signer,
        rwaMint: address(rwaMint),
        usdcMint: address(usdcMint),
        amount,
      });
      return sendInstruction(signer, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}
