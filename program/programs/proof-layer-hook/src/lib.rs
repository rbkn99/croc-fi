use anchor_lang::{prelude::*, system_program};
use anchor_spl::token_interface::Mint;
use spl_tlv_account_resolution::{
    account::ExtraAccountMeta, seeds::Seed, state::ExtraAccountMetaList,
};
use spl_transfer_hook_interface::instruction::{ExecuteInstruction, TransferHookInstruction};

declare_id!("hok77RhLaScwvc4Fsk3EU7DKBzGK1oEeUcMWnodnwQJ");

use anchor_lang::solana_program::pubkey;

/// ProofLayer program ID — used to derive PDAs for asset, attestation, whitelist
const PROOF_LAYER_ID: Pubkey =
    pubkey!("croZ9hcrqGz3fZHTkBfEaRbZQXkhfW4ZhbVBiFinNrF");

// ── Account state re-declared (read-only) ─────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum AssetStatus {
    Active,
    Paused,
    Redeemed,
}

#[account]
pub struct AssetRegistry {
    pub issuer: Pubkey,
    pub mint: Pubkey,
    pub asset_type: u8,
    pub status: AssetStatus,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct AttestationRecord {
    pub asset: Pubkey,
    pub nav_bps: u64,
    pub yield_rate_bps: u64,
    pub proof_hash: [u8; 32],
    pub valid_until: i64,
    pub published_at: i64,
    pub bump: u8,
}

#[account]
pub struct WhitelistEntry {
    pub asset: Pubkey,
    pub wallet: Pubkey,
    pub added_at: i64,
    pub bump: u8,
}

// ── Error codes ───────────────────────────────────────────────

#[error_code]
pub enum HookError {
    #[msg("Asset is paused")]
    AssetPaused,
    #[msg("Attestation has expired")]
    StaleAttestation,
    #[msg("Recipient is not whitelisted")]
    NotWhitelisted,
}

// ── Program ───────────────────────────────────────────────────

#[program]
pub mod proof_layer_hook {
    use super::*;

    /// Initialize the extra account meta list that Token-2022 passes
    /// to the hook on every transfer. This tells the runtime which
    /// additional accounts the `transfer_hook` instruction needs.
    pub fn initialize_extra_account_meta_list(
        ctx: Context<InitializeExtraAccountMetaList>,
    ) -> Result<()> {
        let mint_key = ctx.accounts.mint.key();

        // Extra accounts the hook needs, resolved via seeds:
        // 1. AssetRegistry  PDA: ["asset", mint]           on PROOF_LAYER_ID
        // 2. AttestationRecord PDA: ["attestation", asset]  on PROOF_LAYER_ID
        // 3. WhitelistEntry PDA: ["whitelist", asset, destination_authority] on PROOF_LAYER_ID
        let extra_metas = vec![
            // AssetRegistry — seeds: ["asset", mint_pubkey]
            ExtraAccountMeta::new_external_pda_with_seeds(
                5, // program index in remaining accounts
                &[
                    Seed::Literal {
                        bytes: b"asset".to_vec(),
                    },
                    Seed::AccountKey { index: 1 }, // mint
                ],
                false, // is_signer
                false, // is_writable
            )?,
            // AttestationRecord — seeds: ["attestation", asset_registry_key]
            // asset_registry_key is extra_account[0] (index 5 + 0 in all accounts? no...)
            // In the extra account meta list, the first extra account has index 0
            // relative to the extra accounts. But ExtraAccountMeta resolves seeds
            // against the full account list. The transfer hook accounts are:
            //   0: source
            //   1: mint
            //   2: destination
            //   3: owner/delegate
            //   4: extra_account_meta_list
            //   5+: extra accounts
            ExtraAccountMeta::new_external_pda_with_seeds(
                5, // program index
                &[
                    Seed::Literal {
                        bytes: b"attestation".to_vec(),
                    },
                    Seed::AccountKey { index: 5 }, // asset_registry (first extra account)
                ],
                false,
                false,
            )?,
            // WhitelistEntry — seeds: ["whitelist", asset_registry_key, destination_authority]
            ExtraAccountMeta::new_external_pda_with_seeds(
                5, // program index
                &[
                    Seed::Literal {
                        bytes: b"whitelist".to_vec(),
                    },
                    Seed::AccountKey { index: 5 }, // asset_registry
                    Seed::AccountKey { index: 3 }, // owner/destination authority
                ],
                false,
                false,
            )?,
            // ProofLayer program itself (so we can derive PDAs against it)
            ExtraAccountMeta::new_with_pubkey(&PROOF_LAYER_ID, false, false)?,
        ];

        let account_info = ctx.accounts.extra_account_meta_list.to_account_info();
        let account_size = ExtraAccountMetaList::size_of(extra_metas.len())?;

        // Allocate space
        let lamports = Rent::get()?.minimum_balance(account_size);
        let signer_seeds: &[&[u8]] = &[
            b"extra-account-metas",
            ctx.accounts.mint.to_account_info().key.as_ref(),
            &[ctx.bumps.extra_account_meta_list],
        ];

        system_program::create_account(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::CreateAccount {
                    from: ctx.accounts.payer.to_account_info(),
                    to: account_info.clone(),
                },
                &[signer_seeds],
            ),
            lamports,
            account_size as u64,
            &crate::id(),
        )?;

        ExtraAccountMetaList::init::<ExecuteInstruction>(
            &mut account_info.try_borrow_mut_data()?,
            &extra_metas,
        )?;

        msg!("Extra account meta list initialized for mint {}", mint_key);
        Ok(())
    }

    /// The actual transfer hook — called by Token-2022 on every transfer.
    /// Enforces: asset active, attestation fresh, recipient whitelisted.
    pub fn transfer_hook(ctx: Context<TransferHook>, _amount: u64) -> Result<()> {
        // 1. Asset must be active
        let asset = &ctx.accounts.asset_registry;
        require!(
            asset.status == AssetStatus::Active,
            HookError::AssetPaused
        );

        // 2. Attestation must be fresh
        let clock = Clock::get()?;
        let attestation = &ctx.accounts.attestation;
        require!(
            attestation.valid_until > clock.unix_timestamp,
            HookError::StaleAttestation
        );

        // 3. Recipient must be whitelisted
        // The whitelist_entry PDA existence is the proof.
        // If the account doesn't exist / can't deserialize, Anchor
        // will reject before we even get here.
        let _whitelist = &ctx.accounts.whitelist_entry;

        msg!("Transfer hook passed: compliance verified");
        Ok(())
    }

    /// Fallback for unrecognized instructions — required by the
    /// transfer hook interface so Token-2022 can call `Execute`.
    pub fn fallback<'info>(
        program_id: &Pubkey,
        accounts: &'info [AccountInfo<'info>],
        data: &[u8],
    ) -> Result<()> {
        let instruction = TransferHookInstruction::unpack(data)?;

        match instruction {
            TransferHookInstruction::Execute { amount } => {
                let amount_bytes = amount.to_le_bytes();
                __private::__global::transfer_hook(program_id, accounts, &amount_bytes)
            }
            _ => Err(ProgramError::InvalidInstructionData.into()),
        }
    }
}

// ── Accounts ──────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The Token-2022 mint this hook is attached to
    pub mint: InterfaceAccount<'info, Mint>,

    /// CHECK: Initialized in the instruction body
    #[account(
        mut,
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump,
    )]
    pub extra_account_meta_list: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferHook<'info> {
    /// CHECK: source token account
    pub source: AccountInfo<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    /// CHECK: destination token account
    pub destination: AccountInfo<'info>,

    /// CHECK: owner/delegate of destination
    pub authority: AccountInfo<'info>,

    /// CHECK: extra account meta list PDA
    #[account(
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump,
    )]
    pub extra_account_meta_list: AccountInfo<'info>,

    // ── Extra accounts (must match the order in InitializeExtraAccountMetaList) ──

    /// The ProofLayer asset registry for this mint
    #[account(
        owner = PROOF_LAYER_ID,
    )]
    pub asset_registry: Account<'info, AssetRegistry>,

    /// The latest attestation for this asset
    #[account(
        owner = PROOF_LAYER_ID,
    )]
    pub attestation: Account<'info, AttestationRecord>,

    /// The whitelist entry for the destination wallet
    #[account(
        owner = PROOF_LAYER_ID,
    )]
    pub whitelist_entry: Account<'info, WhitelistEntry>,

    /// CHECK: ProofLayer program (needed for PDA resolution)
    #[account(address = PROOF_LAYER_ID)]
    pub proof_layer_program: AccountInfo<'info>,
}
