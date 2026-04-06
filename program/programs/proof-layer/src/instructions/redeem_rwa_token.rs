use anchor_lang::prelude::*;
use anchor_spl::{token_2022::Token2022, token_interface::Mint};
use anchor_spl::token_interface::TokenAccount;

use crate::error::ProofLayerError;
use crate::events::RedemptionQueued;
use crate::state::*;

pub fn handler(ctx: Context<RedeemRwaToken>, amount: u64) -> Result<()> {
    let clock = Clock::get()?;

    // Enforce minimum redeem amount
    require!(
        amount >= ctx.accounts.asset_registry.min_redeem_amount,
        ProofLayerError::BelowMinAmount
    );

    // Enforce daily redeem limit
    let today = clock.unix_timestamp / 86_400;
    let asset = &mut ctx.accounts.asset_registry;
    if asset.last_redeem_day != today {
        asset.last_redeem_day = today;
        asset.daily_redeemed = 0;
    }
    let new_daily = asset
        .daily_redeemed
        .checked_add(amount)
        .ok_or(ProofLayerError::Overflow)?;
    if asset.daily_redeem_limit > 0 {
        require!(
            new_daily <= asset.daily_redeem_limit,
            ProofLayerError::DailyLimitExceeded
        );
    }
    asset.daily_redeemed = new_daily;

    // Burn RWA tokens
    let burn_accounts = anchor_spl::token_interface::Burn {
        mint: ctx.accounts.rwa_mint.to_account_info(),
        from: ctx.accounts.user_rwa.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let burn_ctx = CpiContext::new(
        ctx.accounts.token_2022_program.to_account_info(),
        burn_accounts,
    );
    anchor_spl::token_interface::burn(burn_ctx, amount)?;

    // Create redemption request
    let request = &mut ctx.accounts.redemption_request;
    request.asset = ctx.accounts.asset_registry.key();
    request.user = ctx.accounts.user.key();
    request.amount = amount;
    request.requested_at = clock.unix_timestamp;
    request.bump = ctx.bumps.redemption_request;

    emit!(RedemptionQueued {
        asset: request.asset,
        user: request.user,
        amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct RedeemRwaToken<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"asset", rwa_mint.key().as_ref()],
        bump = asset_registry.bump,
    )]
    pub asset_registry: Account<'info, AssetRegistry>,

    #[account(mut)]
    pub rwa_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = rwa_mint,
        associated_token::authority = user,
        associated_token::token_program = token_2022_program,
    )]
    pub user_rwa: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = user,
        space = 8 + RedemptionRequest::INIT_SPACE,
        seeds = [b"redemption", asset_registry.key().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub redemption_request: Account<'info, RedemptionRequest>,

    pub token_2022_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}
