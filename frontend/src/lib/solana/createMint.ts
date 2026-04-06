/**
 * Build instructions for creating a Token-2022 mint with
 * TransferHook + InterestBearingMint extensions.
 *
 * Uses raw instruction encoding compatible with @solana/kit.
 */

import {
  type Address,
  type Instruction,
  type TransactionSigner,
  getAddressEncoder,
} from "@solana/kit";

const TOKEN_2022_PROGRAM: Address = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" as Address;
const SYSTEM_PROGRAM: Address = "11111111111111111111111111111111" as Address;

// Base mint size + extension overhead
const TYPE_SIZE = 2; // ExtensionType u16
const LENGTH_SIZE = 2; // data length u16
const TRANSFER_HOOK_DATA_SIZE = 64; // authority (32) + programId (32)
const INTEREST_BEARING_DATA_SIZE = 52; // authority (32) + rate (2) + timestamps, padded

function getMintLenWithExtensions(): number {
  // Multisig size padding for TLV offset
  const BASE_WITH_TLV = 166; // BASE (82) + padding to multisig boundary (165) + 1 for AccountType
  const ext1 = TYPE_SIZE + LENGTH_SIZE + TRANSFER_HOOK_DATA_SIZE;
  const ext2 = TYPE_SIZE + LENGTH_SIZE + INTEREST_BEARING_DATA_SIZE;
  return BASE_WITH_TLV + ext1 + ext2;
}

export const HOOK_PROGRAM_ID: Address = "hok77RhLaScwvc4Fsk3EU7DKBzGK1oEeUcMWnodnwQJ" as Address;

/**
 * Returns instructions to create a Token-2022 mint with extensions.
 * The caller must sign with both `payer` and `mintKeypair`.
 */
export function buildCreateMintInstructions({
  payer,
  mintKeypair,
  mintAuthority,
  decimals,
  lamports,
}: {
  payer: TransactionSigner;
  mintKeypair: TransactionSigner;
  mintAuthority: Address;
  decimals: number;
  lamports: bigint;
}): Instruction[] {
  const mintAddress = mintKeypair.address;

  // 1. SystemProgram.createAccount
  const createAccountIx: Instruction = {
    programAddress: SYSTEM_PROGRAM,
    accounts: [
      { address: payer.address, role: 3 /* writable signer */ },
      { address: mintAddress, role: 3 /* writable signer */ },
    ],
    data: encodeCreateAccount(lamports, BigInt(getMintLenWithExtensions()), TOKEN_2022_PROGRAM),
  };

  // 2. InitializeTransferHook (must be before InitializeMint)
  const initTransferHookIx: Instruction = {
    programAddress: TOKEN_2022_PROGRAM,
    accounts: [
      { address: mintAddress, role: 1 /* writable */ },
    ],
    data: encodeInitTransferHook(payer.address, HOOK_PROGRAM_ID),
  };

  // 3. InitializeInterestBearingMint
  const initInterestBearingIx: Instruction = {
    programAddress: TOKEN_2022_PROGRAM,
    accounts: [
      { address: mintAddress, role: 1 /* writable */ },
    ],
    data: encodeInitInterestBearing(payer.address, 0),
  };

  // 4. InitializeMint2 (no freeze authority)
  const initMintIx: Instruction = {
    programAddress: TOKEN_2022_PROGRAM,
    accounts: [
      { address: mintAddress, role: 1 /* writable */ },
    ],
    data: encodeInitMint2(decimals, mintAuthority, null),
  };

  return [createAccountIx, initTransferHookIx, initInterestBearingIx, initMintIx];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMintRentLamports(rpc: { getMinimumBalanceForRentExemption: (...args: any[]) => { send: () => Promise<bigint> } }): Promise<bigint> {
  return rpc.getMinimumBalanceForRentExemption(BigInt(getMintLenWithExtensions())).send();
}

// ── Instruction encoders ──────────────────────────────────

function encodeCreateAccount(lamports: bigint, space: bigint, owner: Address): Uint8Array {
  const addrEncoder = getAddressEncoder();
  const data = new Uint8Array(4 + 8 + 8 + 32);
  const view = new DataView(data.buffer);
  view.setUint32(0, 0, true); // SystemInstruction::CreateAccount
  view.setBigUint64(4, lamports, true);
  view.setBigUint64(12, space, true);
  data.set(addrEncoder.encode(owner), 20);
  return data;
}

function encodeInitTransferHook(authority: Address, programId: Address): Uint8Array {
  const addrEncoder = getAddressEncoder();
  // Token-2022 instruction: InitializeTransferHook = 36 (in TransferHookInstruction extension)
  // Actually it's a Token2022Instruction discriminator byte
  const data = new Uint8Array(1 + 1 + 32 + 32);
  data[0] = 36; // Token-2022: TransferHookExtension
  data[1] = 0;  // Initialize
  data.set(addrEncoder.encode(authority), 2);
  data.set(addrEncoder.encode(programId), 34);
  return data;
}

function encodeInitInterestBearing(authority: Address, rate: number): Uint8Array {
  const addrEncoder = getAddressEncoder();
  const data = new Uint8Array(1 + 1 + 32 + 2);
  data[0] = 33; // Token-2022: InterestBearingMintExtension
  data[1] = 0;  // Initialize
  data.set(addrEncoder.encode(authority), 2);
  const view = new DataView(data.buffer);
  view.setInt16(34, rate, true);
  return data;
}

function encodeInitMint2(decimals: number, mintAuthority: Address, freezeAuthority: Address | null): Uint8Array {
  const addrEncoder = getAddressEncoder();
  // InitializeMint2 = instruction index 20
  const data = new Uint8Array(1 + 1 + 32 + 1 + 32);
  data[0] = 20; // InitializeMint2
  data[1] = decimals;
  data.set(addrEncoder.encode(mintAuthority), 2);
  data[34] = freezeAuthority ? 1 : 0;
  if (freezeAuthority) {
    data.set(addrEncoder.encode(freezeAuthority), 35);
  }
  return data;
}
