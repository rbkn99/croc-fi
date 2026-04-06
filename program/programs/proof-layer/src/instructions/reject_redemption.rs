use anchor_lang::prelude::*;
use anchor_spl::token_2022::Token2022;
use anchor_spl::token_interface::Mint;

use crate::error::ProofLayerError;
use crate::events::RedemptionRejected;
use crate::state::*;

pub fn handler(ctx: Context<RejectRedemption>) -> Result<()> {
    let request = &ctx.accounts.redemption_request;
    let clock = Clock::get()?;

    // Re-mint RWA tokens back to user (they were burned on redeem)
    let mint_key = ctx.accounts.rwa_mint.key();
    let seeds = &[b"asset", mint_key.as_ref(), &[ctx.accounts.asset_registry.bump]];
    let signer_seeds = &[&seeds[..]];

    let mint_accounts = anchor_spl::token_interface::MintTo {
        mint: ctx.accounts.rwa_mint.to_account_info(),
        to: ctx.accounts.user_rwa.to_account_info(),
        authority: ctx.accounts.asset_registry.to_account_info(),
    };
    let mint_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_2022_program.to_account_info(),
        mint_accounts,
        signer_seeds,
    );
    anchor_spl::token_interface::mint_to(mint_ctx, request.amount)?;

    emit!(RedemptionRejected {
        asset: ctx.accounts.asset_registry.key(),
        user: request.user,
        amount: request.amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct RejectRedemption<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,

    #[account(
        seeds = [b"asset", rwa_mint.key().as_ref()],
        bump = asset_registry.bump,
        has_one = issuer @ ProofLayerError::UnauthorizedIssuer,
    )]
    pub asset_registry: Account<'info, AssetRegistry>,

    #[account(
        mut,
        close = user,
        seeds = [b"redemption", asset_registry.key().as_ref(), redemption_request.user.as_ref()],
        bump = redemption_request.bump,
    )]
    pub redemption_request: Account<'info, RedemptionRequest>,

    #[account(mut)]
    pub rwa_mint: InterfaceAccount<'info, Mint>,

    /// CHECK: Validated via redemption_request.user
    #[account(address = redemption_request.user)]
    pub user: AccountInfo<'info>,

    /// CHECK: User's RWA token account
    #[account(
        mut,
        associated_token::mint = rwa_mint,
        associated_token::authority = user,
        associated_token::token_program = token_2022_program,
    )]
    pub user_rwa: InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,

    pub token_2022_program: Program<'info, Token2022>,
}
