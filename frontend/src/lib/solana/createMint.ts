/**
 * Build Token-2022 mint creation instructions using @solana/spl-token
 * and convert to @solana/kit format for transaction message building.
 */

import {
  type Address,
  type Instruction,
  address as kitAddress,
} from "@solana/kit";
import {
  PublicKey,
  SystemProgram,
  Keypair,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeTransferHookInstruction,
  createInitializeInterestBearingMintInstruction,
  getMintLen,
  ExtensionType,
} from "@solana/spl-token";

export const HOOK_PROGRAM_ID: Address = "hok77RhLaScwvc4Fsk3EU7DKBzGK1oEeUcMWnodnwQJ" as Address;

/**
 * Convert a @solana/web3.js v1 TransactionInstruction to @solana/kit Instruction format.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function legacyToKit(ix: any): Instruction {
  return {
    programAddress: kitAddress(ix.programId.toBase58()),
    accounts: ix.keys.map((k: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }) => ({
      address: kitAddress(k.pubkey.toBase58()),
      role: (k.isWritable ? 1 : 0) | (k.isSigner ? 2 : 0),
    })),
    data: ix.data,
  };
}

function getMintSize(): number {
  return getMintLen([ExtensionType.TransferHook, ExtensionType.InterestBearingConfig]);
}

/**
 * Returns instructions to create a Token-2022 mint with TransferHook + InterestBearingMint.
 */
export function buildCreateMintInstructions({
  payer,
  mintPubkey,
  mintAuthority,
  decimals,
  lamports,
}: {
  payer: Address;
  mintPubkey: Address;
  mintAuthority: Address;
  decimals: number;
  lamports: bigint;
}): Instruction[] {
  const payerPk = new PublicKey(payer);
  const mintPk = new PublicKey(mintPubkey);
  const authorityPk = new PublicKey(mintAuthority);
  const hookPk = new PublicKey(HOOK_PROGRAM_ID);

  const createAccountIx = SystemProgram.createAccount({
    fromPubkey: payerPk,
    newAccountPubkey: mintPk,
    space: getMintSize(),
    lamports: Number(lamports),
    programId: TOKEN_2022_PROGRAM_ID,
  });

  const initTransferHookIx = createInitializeTransferHookInstruction(
    mintPk,
    payerPk,
    hookPk,
    TOKEN_2022_PROGRAM_ID,
  );

  const initInterestBearingIx = createInitializeInterestBearingMintInstruction(
    mintPk,
    payerPk,
    0,
    TOKEN_2022_PROGRAM_ID,
  );

  const initMintIx = createInitializeMintInstruction(
    mintPk,
    decimals,
    authorityPk,
    null, // no freeze authority
    TOKEN_2022_PROGRAM_ID,
  );

  return [
    legacyToKit(createAccountIx),
    legacyToKit(initTransferHookIx),
    legacyToKit(initInterestBearingIx),
    legacyToKit(initMintIx),
  ];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getMintRentLamports(rpc: any): Promise<bigint> {
  return rpc.getMinimumBalanceForRentExemption(BigInt(getMintSize())).send();
}
