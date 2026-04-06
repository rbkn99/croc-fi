use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::error::ProofLayerError;
use crate::events::VaultWithdrawal;
use crate::state::*;

pub fn handler(ctx: Context<WithdrawFromVault>, amount: u64) -> Result<()> {
    let mint_key = ctx.accounts.rwa_mint.key();
    let seeds = &[b"asset", mint_key.as_ref(), &[ctx.accounts.asset_registry.bump]];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = anchor_spl::token_interface::TransferChecked {
        from: ctx.accounts.vault_usdc.to_account_info(),
        mint: ctx.accounts.usdc_mint.to_account_info(),
        to: ctx.accounts.issuer_usdc.to_account_info(),
        authority: ctx.accounts.asset_registry.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    anchor_spl::token_interface::transfer_checked(
        cpi_ctx,
        amount,
        ctx.accounts.usdc_mint.decimals,
    )?;

    let clock = Clock::get()?;
    emit!(VaultWithdrawal {
        asset: ctx.accounts.asset_registry.key(),
        issuer: ctx.accounts.issuer.key(),
        amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawFromVault<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,

    #[account(
        seeds = [b"asset", rwa_mint.key().as_ref()],
        bump = asset_registry.bump,
        has_one = issuer @ ProofLayerError::UnauthorizedIssuer,
    )]
    pub asset_registry: Account<'info, AssetRegistry>,

    pub rwa_mint: InterfaceAccount<'info, Mint>,

    pub usdc_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = asset_registry,
    )]
    pub vault_usdc: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = issuer,
    )]
    pub issuer_usdc: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}
