"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelectedWalletAccount } from "@solana/react";
import {
  fetchProducts,
  fetchProduct,
  fetchHealth,
  fetchAssetHealth,
  fetchAssetAttestation,
  fetchWhitelistStatus,
  fetchAssetMeta,
  fetchAssetPolicy,
  fetchKycStatus,
  startKyc,
  fetchKycSummary,
  fetchKycList,
  issuerAddToWhitelist,
  issuerRemoveFromWhitelist,
  issuerSyncWhitelist,
  addAssetDocument,
  removeAssetDocument,
  uploadDocument,
} from "./client";
import type { AssetDocument } from "./types";
import type { UploadResult } from "./client";

// --- Products ---

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id),
    enabled: !!id,
  });
}

// --- Backend health ---

export function useBackendHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    retry: false,
    staleTime: 60_000,
  });
}

// --- On-chain asset reads ---

export function useAssetHealth(pubkey: string | undefined) {
  return useQuery({
    queryKey: ["assetHealth", pubkey],
    queryFn: () => fetchAssetHealth(pubkey!),
    enabled: !!pubkey,
    refetchInterval: 30_000,
  });
}

export function useAssetAttestation(pubkey: string | undefined) {
  return useQuery({
    queryKey: ["assetAttestation", pubkey],
    queryFn: () => fetchAssetAttestation(pubkey!),
    enabled: !!pubkey,
    refetchInterval: 30_000,
  });
}

export function useWhitelistStatus(
  assetPubkey: string | undefined,
  walletPubkey: string | undefined
) {
  return useQuery({
    queryKey: ["whitelistStatus", assetPubkey, walletPubkey],
    queryFn: () => fetchWhitelistStatus(assetPubkey!, walletPubkey!),
    enabled: !!assetPubkey && !!walletPubkey,
  });
}

// --- Asset Metadata & Policy ---

export function useAssetMeta(assetId: string | undefined) {
  return useQuery({
    queryKey: ["assetMeta", assetId],
    queryFn: () => fetchAssetMeta(assetId!),
    enabled: !!assetId,
    staleTime: 5 * 60_000,
  });
}

export function useAssetPolicy(assetId: string | undefined) {
  return useQuery({
    queryKey: ["assetPolicy", assetId],
    queryFn: () => fetchAssetPolicy(assetId!),
    enabled: !!assetId,
    staleTime: 5 * 60_000,
  });
}

// --- KYC ---

export function useKycStatus() {
  const [account] = useSelectedWalletAccount();
  const wallet = account?.address;

  return useQuery({
    queryKey: ["kycStatus", wallet],
    queryFn: () => fetchKycStatus(wallet!),
    enabled: !!wallet,
    refetchInterval: 10_000,
  });
}

export function useStartKyc() {
  const queryClient = useQueryClient();
  const [account] = useSelectedWalletAccount();

  return useMutation({
    mutationFn: () => {
      const wallet = account?.address;
      if (!wallet) throw new Error("Wallet not connected");
      return startKyc(wallet);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kycStatus"] });
    },
  });
}

// --- Issuer / Admin ---

export function useKycSummary() {
  return useQuery({
    queryKey: ["kycSummary"],
    queryFn: fetchKycSummary,
    refetchInterval: 30_000,
  });
}

export function useKycList() {
  return useQuery({
    queryKey: ["kycList"],
    queryFn: fetchKycList,
  });
}

export function useAddToWhitelist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetPubkey, wallet }: { assetPubkey: string; wallet: string }) =>
      issuerAddToWhitelist(assetPubkey, wallet),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whitelistStatus"] });
    },
  });
}

export function useRemoveFromWhitelist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetPubkey, wallet }: { assetPubkey: string; wallet: string }) =>
      issuerRemoveFromWhitelist(assetPubkey, wallet),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whitelistStatus"] });
    },
  });
}

export function useSyncWhitelist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assetPubkey: string) => issuerSyncWhitelist(assetPubkey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whitelistStatus"] });
      queryClient.invalidateQueries({ queryKey: ["kycSummary"] });
    },
  });
}

export function useUploadDocument() {
  return useMutation<UploadResult, Error, File>({
    mutationFn: (file: File) => uploadDocument(file),
  });
}

export function useAddDocument(assetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (doc: Omit<AssetDocument, "hash"> & { hash?: string }) =>
      addAssetDocument(assetId, doc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assetMeta", assetId] });
      queryClient.invalidateQueries({ queryKey: ["product", assetId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useRemoveDocument(assetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (index: number) => removeAssetDocument(assetId, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assetMeta", assetId] });
      queryClient.invalidateQueries({ queryKey: ["product", assetId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
