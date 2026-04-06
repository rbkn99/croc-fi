use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::error::ProofLayerError;
use crate::events::RedemptionFulfilled;
use crate::state::*;

pub fn handler(ctx: Context<FulfillRedemption>) -> Result<()> {
    let request = &ctx.accounts.redemption_request;
    let attestation = &ctx.accounts.attestation;

    let clock = Clock::get()?;
    require!(
        attestation.valid_until > clock.unix_timestamp,
        ProofLayerError::StaleAttestation
    );

    // Calculate USDC payout: amount * nav_bps / 10_000
    let usdc_amount = (request.amount as u128)
        .checked_mul(attestation.nav_bps as u128)
        .ok_or(ProofLayerError::Overflow)?
        .checked_div(10_000)
        .ok_or(ProofLayerError::Overflow)? as u64;

    let mint_key = ctx.accounts.rwa_mint.key();
    let seeds = &[b"asset", mint_key.as_ref(), &[ctx.accounts.asset_registry.bump]];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = anchor_spl::token_interface::TransferChecked {
        from: ctx.accounts.vault_usdc.to_account_info(),
        mint: ctx.accounts.usdc_mint.to_account_info(),
        to: ctx.accounts.user_usdc.to_account_info(),
        authority: ctx.accounts.asset_registry.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    anchor_spl::token_interface::transfer_checked(
        cpi_ctx,
        usdc_amount,
        ctx.accounts.usdc_mint.decimals,
    )?;

    emit!(RedemptionFulfilled {
        asset: ctx.accounts.asset_registry.key(),
        user: request.user,
        rwa_amount: request.amount,
        usdc_amount,
        nav_bps: attestation.nav_bps,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct FulfillRedemption<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,

    #[account(
        seeds = [b"asset", rwa_mint.key().as_ref()],
        bump = asset_registry.bump,
        has_one = issuer @ ProofLayerError::UnauthorizedIssuer,
    )]
    pub asset_registry: Account<'info, AssetRegistry>,

    #[account(
        seeds = [b"attestation", asset_registry.key().as_ref()],
        bump = attestation.bump,
    )]
    pub attestation: Account<'info, AttestationRecord>,

    #[account(
        mut,
        close = user,
        seeds = [b"redemption", asset_registry.key().as_ref(), redemption_request.user.as_ref()],
        bump = redemption_request.bump,
    )]
    pub redemption_request: Account<'info, RedemptionRequest>,

    pub rwa_mint: InterfaceAccount<'info, Mint>,

    pub usdc_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = asset_registry,
    )]
    pub vault_usdc: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: Validated via redemption_request.user
    #[account(address = redemption_request.user)]
    pub user: AccountInfo<'info>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = user,
    )]
    pub user_usdc: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}
