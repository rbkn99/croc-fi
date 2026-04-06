import { createSolanaRpc, address, type Address } from "@solana/kit";
import { getRpcUrl } from "./client";

// Re-export Codama-generated client
export {
  proofLayerProgram,
  PROOF_LAYER_PROGRAM_ADDRESS,
} from "./generated/src/generated/programs";

export {
  fetchAssetRegistry,
  fetchAllAssetRegistry,
  fetchMaybeAssetRegistry,
  type AssetRegistry,
} from "./generated/src/generated/accounts/assetRegistry";

export {
  fetchAttestationRecord,
  fetchAllAttestationRecord,
  fetchMaybeAttestationRecord,
  type AttestationRecord,
} from "./generated/src/generated/accounts/attestationRecord";

export {
  fetchWhitelistEntry,
  fetchAllWhitelistEntry,
  fetchMaybeWhitelistEntry,
  type WhitelistEntry,
} from "./generated/src/generated/accounts/whitelistEntry";

export {
  fetchRedemptionRequest,
  fetchAllRedemptionRequest,
  fetchMaybeRedemptionRequest,
  type RedemptionRequest,
} from "./generated/src/generated/accounts/redemptionRequest";

export {
  findAssetRegistryPda,
  findAttestationPda,
  findWhitelistEntryPda,
  findRedemptionRequestPda,
} from "./generated/src/generated/pdas";

export {
  getCreateAssetInstructionAsync,
  type CreateAssetAsyncInput,
} from "./generated/src/generated/instructions/createAsset";

export {
  getPauseAssetInstruction,
  type PauseAssetInput,
} from "./generated/src/generated/instructions/pauseAsset";

export {
  getResumeAssetInstruction,
  type ResumeAssetInput,
} from "./generated/src/generated/instructions/resumeAsset";

export {
  getAddToWhitelistInstructionAsync,
  type AddToWhitelistAsyncInput,
} from "./generated/src/generated/instructions/addToWhitelist";

export {
  getRemoveFromWhitelistInstruction,
  type RemoveFromWhitelistInput,
} from "./generated/src/generated/instructions/removeFromWhitelist";

export {
  getMintRwaTokenInstructionAsync,
  type MintRwaTokenAsyncInput,
} from "./generated/src/generated/instructions/mintRwaToken";

export {
  getRedeemRwaTokenInstructionAsync,
  type RedeemRwaTokenAsyncInput,
} from "./generated/src/generated/instructions/redeemRwaToken";

export {
  getFulfillRedemptionInstructionAsync,
  type FulfillRedemptionAsyncInput,
} from "./generated/src/generated/instructions/fulfillRedemption";

export {
  getRejectRedemptionInstructionAsync,
  type RejectRedemptionAsyncInput,
} from "./generated/src/generated/instructions/rejectRedemption";

export {
  getWithdrawFromVaultInstructionAsync,
  type WithdrawFromVaultAsyncInput,
} from "./generated/src/generated/instructions/withdrawFromVault";

export {
  getDepositToVaultInstructionAsync,
  type DepositToVaultAsyncInput,
} from "./generated/src/generated/instructions/depositToVault";

export {
  getInitAttestationConfigInstructionAsync,
  type InitAttestationConfigAsyncInput,
} from "./generated/src/generated/instructions/initAttestationConfig";

export type { AssetType, AssetStatus } from "./generated/src/generated/types";

// ── RPC helper ──────────────────────────────────────────────

export function createRpc() {
  return createSolanaRpc(getRpcUrl());
}

// ── Utility ─────────────────────────────────────────────────

export function assetTypeToString(t: { __kind: string }): string {
  return t.__kind;
}

export function assetStatusToString(s: { __kind: string }): string {
  return s.__kind.toLowerCase();
}

export function shortenAddress(addr: string, len = 4): string {
  if (addr.length <= len * 2 + 3) return addr;
  return `${addr.slice(0, len)}...${addr.slice(-len)}`;
}

export { address, type Address };
