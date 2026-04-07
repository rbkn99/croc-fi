"use client";

import { useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelectedWalletAccount } from "@solana/react";
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
  generateKeyPairSigner,
  getTransactionEncoder,
  getProgramDerivedAddress,
  getAddressEncoder,
  getU64Encoder,
  type TransactionSendingSigner,
  type Address,
} from "@solana/kit";
import type { UiWalletAccount } from "@wallet-standard/ui";
import { getWalletAccountFeature } from "@wallet-standard/ui-features";
import { getWalletAccountForUiWalletAccount_DO_NOT_USE_OR_YOU_WILL_BE_FIRED } from "@wallet-standard/ui-registry";
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
  getToggleWhitelistInstruction,
  getMintRwaTokenInstructionAsync,
  getRedeemRwaTokenInstructionAsync,
  getFulfillRedemptionInstructionAsync,
  getRejectRedemptionInstructionAsync,
  getWithdrawFromVaultInstructionAsync,
  getDepositToVaultInstructionAsync,
  getInitAttestationConfigInstructionAsync,
  getSubmitNavVoteInstruction,
  getFinalizeAttestationInstructionAsync,
  findAttestationConfigPda,
} from "./program";
import {
  getAssetRegistryDecoder,
  ASSET_REGISTRY_DISCRIMINATOR,
} from "./generated/src/generated/accounts/assetRegistry";
import {
  fetchMaybeAttestationConfig,
} from "./generated/src/generated/accounts/attestationConfig";
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
import {
  fetchMaybePlatformConfig,
  type PlatformConfig,
} from "./generated/src/generated/accounts/platformConfig";
import { getInitializePlatformInstructionAsync } from "./generated/src/generated/instructions/initializePlatform";
import { findPlatformConfigPda } from "./generated/src/generated/pdas";


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

import { getBase58Decoder } from "@solana/kit";

/**
 * Wait for a transaction signature to be confirmed via polling.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function confirmSignature(sigBytes: any): Promise<string> {
  const rpc = getRpc();
  const sigStr = (typeof sigBytes === "string" ? sigBytes : getBase58Decoder().decode(sigBytes)) as string;
  console.log("[confirm] waiting for:", sigStr);

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { value } = await (rpc as any).getSignatureStatuses([sigStr]).send();
    const status = value?.[0];
    if (status) {
      if (status.err) {
        console.error("[confirm] tx failed:", status.err);
        throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      }
      if (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized") {
        console.log("[confirm] confirmed:", sigStr);
        return sigStr;
      }
    }
  }
  throw new Error("Transaction confirmation timeout");
}

async function sendInstruction(
  account: UiWalletAccount,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instruction: any
) {
  const signer = makeSigner(account);
  const rpc = getRpc();
  const { value: blockhash } = await rpc.getLatestBlockhash().send();
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(signer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
    (m) => appendTransactionMessageInstruction(instruction, m)
  );
  return signSendConfirm(account, message);
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

const SOLANA_SIGN_TX = "solana:signTransaction";

/**
 * Sign with wallet, send via RPC with preflight, confirm.
 * Returns the confirmed transaction signature string.
 */
async function signSendConfirm(
  walletAccount: UiWalletAccount,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  txMessage: any
): Promise<string> {
  const chain = getSolanaChain();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const feature = getWalletAccountFeature(walletAccount, SOLANA_SIGN_TX) as any;
  const rawAccount = getWalletAccountForUiWalletAccount_DO_NOT_USE_OR_YOU_WILL_BE_FIRED(walletAccount);

  // 1. Compile + partially sign (local signers like mint keypair)
  const { partiallySignTransactionMessageWithSigners } = await import("@solana/kit");
  const partialSigned = await partiallySignTransactionMessageWithSigners(txMessage);
  const encoder = getTransactionEncoder();
  const wireBytes = encoder.encode(partialSigned);
  console.log("[tx] requesting wallet signature, bytes:", wireBytes.length);

  // 2. Wallet signs
  const [{ signedTransaction }] = await feature.signTransaction({
    account: rawAccount,
    chain,
    transaction: wireBytes instanceof Uint8Array ? wireBytes : new Uint8Array(wireBytes),
  });
  console.log("[tx] wallet signed");

  // 3. Send via RPC with preflight
  const rpc = getRpc();
  const txBytes = signedTransaction instanceof Uint8Array
    ? signedTransaction
    : new Uint8Array(Object.values(signedTransaction));
  const b64 = btoa(String.fromCharCode(...txBytes));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sig: string = await (rpc as any).sendTransaction(b64, {
    encoding: "base64",
    skipPreflight: false,
    preflightCommitment: "confirmed",
  }).send();
  console.log("[tx] sent, sig:", sig);

  // 4. Confirm
  return confirmSignature(sig);
}

/**
 * Minimal TransactionSendingSigner for Codama instruction builders.
 * Only used for address — actual signing goes through signSendConfirm.
 */
function makeSigner(walletAccount: UiWalletAccount): TransactionSendingSigner {
  return {
    address: address(walletAccount.address),
    async signAndSendTransactions() {
      throw new Error("Use signSendConfirm instead");
    },
  };
}

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

// ── Token balance hook ─────────────────────────────────────

export function useTokenBalance(mint: string | undefined, owner: string | undefined) {
  return useQuery({
    queryKey: ["tokenBalance", mint, owner],
    queryFn: async (): Promise<number> => {
      if (!mint || !owner) return 0;
      const rpc = getRpc();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await (rpc as any)
        .getTokenAccountsByOwner(
          address(owner),
          { mint: address(mint) },
          { encoding: "base64" }
        )
        .send();
      if (!result.value || result.value.length === 0) return 0;
      const data = Uint8Array.from(
        atob(result.value[0].account.data[0] as string),
        (c: string) => c.charCodeAt(0)
      );
      // Token account layout: amount is at offset 64, 8 bytes LE
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const amount = view.getBigUint64(64, true);
      return Number(amount) / 1e6;
    },
    enabled: !!mint && !!owner,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

// ── Mutation hooks ──────────────────────────────────────────

export function useCreateAsset() {
  const { account } = useWalletSigner();
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
      if (!account) throw new Error("Wallet not connected");
      const signer = makeSigner(account);
      console.log("[CreateAsset] signer:", signer.address);

      const rpc = getRpc();
      const mintKeypair = await generateKeyPairSigner();
      const mintAddr = mintKeypair.address;
      console.log("[CreateAsset] mint keypair:", mintAddr);

      // Derive asset registry PDA (will be mint authority)
      const assetRegistryAddress = await findAssetRegistryPda({ rwaMint: mintAddr });
      console.log("[CreateAsset] asset registry PDA:", assetRegistryAddress[0]);

      // Get rent
      const lamports = await getMintRentLamports(rpc);
      console.log("[CreateAsset] rent lamports:", lamports.toString());

      // Build mint creation instructions (uses payer/mint as Address, not signer)
      const mintIxs = buildCreateMintInstructions({
        payer: signer.address,
        mintPubkey: mintAddr,
        mintAuthority: assetRegistryAddress[0],
        decimals: 6,
        lamports,
      });
      console.log("[CreateAsset] mint instructions:", mintIxs.length);

      // Replace raw account metas with actual signers for payer and mint
      const mintIxsWithSigners = mintIxs.map((ix) => ({
        ...ix,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        accounts: (ix.accounts ?? []).map((acc: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const a = acc as any;
          if (a.address === signer.address && (a.role & 2)) {
            return { ...a, signer };
          }
          if (a.address === mintAddr && (a.role & 2)) {
            return { ...a, signer: mintKeypair };
          }
          return a;
        }),
      }));

      // Build create_asset instruction
      const typeMap: Record<string, AssetType> = {
        Treasury: AssetType.Treasury,
        CorporateBond: AssetType.CorporateBond,
        MoneyMarket: AssetType.MoneyMarket,
        Commodity: AssetType.Commodity,
      };
      const createAssetIx = await getCreateAssetInstructionAsync({
        issuer: signer,
        rwaMint: mintAddr,
        // Pass program ID as approvedIssuer to signal Option::None to Anchor
        approvedIssuer: PROOF_LAYER_PROGRAM_ADDRESS,
        assetType: typeMap[assetType] ?? AssetType.Treasury,
        minMintAmount: BigInt(minMintAmount ?? 0),
        minRedeemAmount: BigInt(minRedeemAmount ?? 0),
        dailyMintLimit: BigInt(dailyMintLimit ?? 0),
        dailyRedeemLimit: BigInt(dailyRedeemLimit ?? 0),
      });
      console.log("[CreateAsset] create_asset ix built, accounts:", createAssetIx.accounts?.length);

      // Send as single transaction
      const { value: blockhash } = await rpc.getLatestBlockhash().send();
      console.log("[CreateAsset] blockhash:", blockhash.blockhash);

      const message = pipe(
        createTransactionMessage({ version: 0 }),
        (m) => setTransactionMessageFeePayerSigner(signer, m),
        (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
        (m) => appendTransactionMessageInstructions([...mintIxsWithSigners, createAssetIx], m),
      );
      console.log("[CreateAsset] sending transaction...");

      const sigStr = await signSendConfirm(account, message);
      console.log("[CreateAsset] CONFIRMED:", sigStr);
      return {
        signature: sigStr,
        sig: sigStr,
        assetPubkey: String(assetRegistryAddress[0]),
        mintPubkey: String(mintAddr),
      };
    },
    onSuccess: ({ signature: sig }) => {
      console.log("[CreateAsset] onSuccess:", sig);
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useTogglePause() {
  const { account } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetRegistryPubkey,
      currentStatus,
    }: {
      assetRegistryPubkey: string;
      currentStatus: string;
    }) => {
      if (!account) throw new Error("Wallet not connected");
      const signer = makeSigner(account);
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
      return sendInstruction(account!, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useToggleWhitelist() {
  const { account } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetRegistryPubkey,
      requireWhitelist,
    }: {
      assetRegistryPubkey: string;
      requireWhitelist: boolean;
    }) => {
      if (!account) throw new Error("Wallet not connected");
      const signer = makeSigner(account);
      const ix = getToggleWhitelistInstruction({
        issuer: signer,
        assetRegistry: address(assetRegistryPubkey),
        requireWhitelist,
      });
      return sendInstruction(account!, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useAddToWhitelist() {
  const { account } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetRegistryPubkey,
      walletAddress,
    }: {
      assetRegistryPubkey: string;
      walletAddress: string;
    }) => {
      if (!account) throw new Error("Wallet not connected");
      const signer = makeSigner(account);
      const ix = await getAddToWhitelistInstructionAsync({
        issuer: signer,
        assetRegistry: address(assetRegistryPubkey),
        wallet: address(walletAddress),
      });
      return sendInstruction(account!, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whitelist"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useRemoveFromWhitelist() {
  const { account } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetRegistryPubkey,
      whitelistEntryPubkey,
    }: {
      assetRegistryPubkey: string;
      whitelistEntryPubkey: string;
    }) => {
      if (!account) throw new Error("Wallet not connected");
      const signer = makeSigner(account);
      const ix = getRemoveFromWhitelistInstruction({
        issuer: signer,
        assetRegistry: address(assetRegistryPubkey),
        whitelistEntry: address(whitelistEntryPubkey),
      });
      return sendInstruction(account!, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whitelist"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

// ── Attestation Config ─────────────────────────────────────

export function useInitAttestationConfig() {
  const { account } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mintPubkey,
      attestors,
      threshold,
      toleranceBps,
      validityDuration,
    }: {
      mintPubkey: string;
      attestors: string[];
      threshold: number;
      toleranceBps: number;
      validityDuration: bigint;
    }) => {
      if (!account) throw new Error("Wallet not connected");
      const signer = makeSigner(account);
      // Derive asset registry PDA from mint
      const [assetRegistryAddr] = await findAssetRegistryPda({ rwaMint: address(mintPubkey) });
      const ix = await getInitAttestationConfigInstructionAsync({
        issuer: signer,
        assetRegistry: assetRegistryAddr,
        attestors: attestors.map((a) => address(a)),
        threshold,
        toleranceBps,
        validityDuration,
      });
      return sendInstruction(account!, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

// ── Quick Attest (init config + vote + finalize) ──────────

export function useQuickAttest() {
  const { account } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mintPubkey,
      navBps,
      yieldRateBps,
      validityDuration,
    }: {
      mintPubkey: string;
      navBps: number;
      yieldRateBps: number;
      validityDuration?: number;
    }) => {
      if (!account) throw new Error("Wallet not connected");
      const signer = makeSigner(account);
      const rpc = getRpc();

      // Derive asset registry PDA from mint pubkey
      const mintAddr = address(mintPubkey);
      const [assetAddr] = await findAssetRegistryPda({ rwaMint: mintAddr });
      const [configAddr] = await findAttestationConfigPda({ assetRegistry: assetAddr });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instructions: any[] = [];

      // Check if attestation config exists
      const configAccount = await fetchMaybeAttestationConfig(rpc, configAddr);
      let currentRound = 0n;

      if (!configAccount.exists) {
        // Step 1: init attestation config
        const initIx = await getInitAttestationConfigInstructionAsync({
          issuer: signer,
          assetRegistry: assetAddr,
          attestors: [signer.address],
          threshold: 1,
          toleranceBps: 1000,
          validityDuration: BigInt(validityDuration ?? 86400 * 365),
        });
        instructions.push(initIx);
        currentRound = 0n;
      } else {
        currentRound = configAccount.data.currentRound;
      }

      // Step 2: derive vote PDA and submit nav vote
      const roundBytes = getU64Encoder().encode(currentRound);
      const addressEncoder = getAddressEncoder();
      const [votePda] = await getProgramDerivedAddress({
        programAddress: PROOF_LAYER_PROGRAM_ADDRESS,
        seeds: [
          "vote",
          addressEncoder.encode(configAddr),
          roundBytes,
          addressEncoder.encode(signer.address),
        ],
      });

      const proofHash = new Uint8Array(32);
      const voteIx = getSubmitNavVoteInstruction({
        attestor: signer,
        attestationConfig: configAddr,
        attestationVote: votePda,
        navBps,
        yieldRateBps,
        proofHash,
      });
      instructions.push(voteIx);

      // Step 3: finalize attestation
      const finalizeIx = await getFinalizeAttestationInstructionAsync({
        payer: signer,
        assetRegistry: assetAddr,
      });
      // Add vote account as remaining account
      const finalizeWithVote = {
        ...finalizeIx,
        accounts: [
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(finalizeIx.accounts as any[]),
          { address: votePda, role: 0 }, // readonly, non-signer
        ],
      };
      instructions.push(finalizeWithVote);

      // Send all instructions in one transaction
      const { value: blockhash } = await rpc.getLatestBlockhash().send();
      const message = pipe(
        createTransactionMessage({ version: 0 }),
        (m) => setTransactionMessageFeePayerSigner(signer, m),
        (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
        (m) => appendTransactionMessageInstructions(instructions, m),
      );

      return signSendConfirm(account, message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["attestations"] });
    },
    onError: (err) => {
      console.error("[QuickAttest] failed:", err);
    },
  });
}

// ── Mint & Redeem ──────────────────────────────────────────

export function useMintRwaToken() {
  const { account } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rwaMint,
      usdcMint,
      usdcAmount,
      requireWhitelist,
    }: {
      rwaMint: string;
      usdcMint: string;
      usdcAmount: bigint;
      requireWhitelist?: boolean;
    }) => {
      if (!account) throw new Error("Wallet not connected");
      const signer = makeSigner(account);
      const ix = await getMintRwaTokenInstructionAsync({
        user: signer,
        rwaMint: address(rwaMint),
        usdcMint: address(usdcMint),
        usdcAmount,
        // Pass program ID to signal None (skip whitelist check) when not required
        ...(requireWhitelist ? {} : { whitelistEntry: PROOF_LAYER_PROGRAM_ADDRESS }),
      });
      return sendInstruction(account!, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["tokenBalance"] });
    },
  });
}

export function useRedeemRwaToken() {
  const { account } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rwaMint,
      amount,
    }: {
      rwaMint: string;
      amount: bigint;
    }) => {
      if (!account) throw new Error("Wallet not connected");
      const signer = makeSigner(account);
      const ix = await getRedeemRwaTokenInstructionAsync({
        user: signer,
        rwaMint: address(rwaMint),
        amount,
      });
      return sendInstruction(account!, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["redemptionRequests"] });
      qc.invalidateQueries({ queryKey: ["tokenBalance"] });
    },
  });
}

// ── Issuer: Redemption management ──────────────────────────

export function useFulfillRedemption() {
  const { account } = useWalletSigner();
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
      if (!account) throw new Error("Wallet not connected");
      const signer = makeSigner(account);
      const ix = await getFulfillRedemptionInstructionAsync({
        issuer: signer,
        redemptionRequest: address(redemptionRequestPubkey),
        rwaMint: address(rwaMint),
        usdcMint: address(usdcMint),
        user: address(userPubkey),
      });
      return sendInstruction(account!, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["redemptionRequests"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useRejectRedemption() {
  const { account } = useWalletSigner();
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
      if (!account) throw new Error("Wallet not connected");
      const signer = makeSigner(account);
      const ix = await getRejectRedemptionInstructionAsync({
        issuer: signer,
        redemptionRequest: address(redemptionRequestPubkey),
        rwaMint: address(rwaMint),
        user: address(userPubkey),
      });
      return sendInstruction(account!, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["redemptionRequests"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

// ── Issuer: Vault management ───────────────────────────────

export function useWithdrawFromVault() {
  const { account } = useWalletSigner();
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
      if (!account) throw new Error("Wallet not connected");
      const signer = makeSigner(account);
      const ix = await getWithdrawFromVaultInstructionAsync({
        issuer: signer,
        rwaMint: address(rwaMint),
        usdcMint: address(usdcMint),
        amount,
      });
      return sendInstruction(account!, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useDepositToVault() {
  const { account } = useWalletSigner();
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
      if (!account) throw new Error("Wallet not connected");
      const signer = makeSigner(account);
      const ix = await getDepositToVaultInstructionAsync({
        issuer: signer,
        rwaMint: address(rwaMint),
        usdcMint: address(usdcMint),
        amount,
      });
      return sendInstruction(account!, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

// ── Platform Config ────────────────────────────────────────

export function usePlatformConfig() {
  return useQuery({
    queryKey: ["platformConfig"],
    queryFn: async (): Promise<PlatformConfig | null> => {
      const rpc = getRpc();
      const [configAddress] = await findPlatformConfigPda();
      const result = await fetchMaybePlatformConfig(rpc, configAddress);
      return result.exists ? result.data : null;
    },
    staleTime: 30_000,
  });
}

export function useInitializePlatform() {
  const { account } = useWalletSigner();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!account) throw new Error("Wallet not connected");
      const signer = makeSigner(account);
      const ix = await getInitializePlatformInstructionAsync({
        admin: signer,
        feeCollector: signer.address,
      });
      return sendInstruction(account, ix);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platformConfig"] });
    },
  });
}
