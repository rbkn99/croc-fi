use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::Token2022,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::error::ProofLayerError;
use crate::events::TokensMinted;
use crate::state::*;

pub fn handler(ctx: Context<MintRwaToken>, usdc_amount: u64) -> Result<()> {
    let clock = Clock::get()?;
    let nav_bps = ctx.accounts.attestation.nav_bps;

    require!(
        ctx.accounts.asset_registry.status == AssetStatus::Active,
        ProofLayerError::AssetNotActive
    );
    require!(
        ctx.accounts.attestation.valid_until > clock.unix_timestamp,
        ProofLayerError::StaleAttestation
    );
    require!(
        usdc_amount >= ctx.accounts.asset_registry.min_mint_amount,
        ProofLayerError::BelowMinAmount
    );

    // Enforce whitelist if required by asset
    if ctx.accounts.asset_registry.require_whitelist {
        require!(
            ctx.accounts.whitelist_entry.is_some(),
            ProofLayerError::NotWhitelisted
        );
    }

    // Enforce daily mint limit
    let today = clock.unix_timestamp / 86_400;
    let asset = &mut ctx.accounts.asset_registry;
    if asset.last_mint_day != today {
        asset.last_mint_day = today;
        asset.daily_minted = 0;
    }
    let new_daily = asset
        .daily_minted
        .checked_add(usdc_amount)
        .ok_or(ProofLayerError::Overflow)?;
    if asset.daily_mint_limit > 0 {
        require!(
            new_daily <= asset.daily_mint_limit,
            ProofLayerError::DailyLimitExceeded
        );
    }
    asset.daily_minted = new_daily;
    let bump = asset.bump;
    let asset_key = asset.key();

    // Calculate RWA amount using NAV: rwa_amount = usdc_amount * 10_000 / nav_bps
    // nav_bps represents the price of 1 RWA token in basis points (e.g. 10_000 = $1.00)
    let rwa_amount = (usdc_amount as u128)
        .checked_mul(10_000)
        .ok_or(ProofLayerError::Overflow)?
        .checked_div(nav_bps as u128)
        .ok_or(ProofLayerError::Overflow)? as u64;

    require!(rwa_amount > 0, ProofLayerError::Overflow);

    // Transfer USDC from user to vault
    let cpi_accounts = anchor_spl::token_interface::TransferChecked {
        from: ctx.accounts.user_usdc.to_account_info(),
        mint: ctx.accounts.usdc_mint.to_account_info(),
        to: ctx.accounts.vault_usdc.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
    );
    anchor_spl::token_interface::transfer_checked(
        cpi_ctx,
        usdc_amount,
        ctx.accounts.usdc_mint.decimals,
    )?;

    // Mint RWA tokens to user based on NAV price
    let mint_key = ctx.accounts.rwa_mint.key();
    let seeds = &[b"asset", mint_key.as_ref(), &[bump]];
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
    anchor_spl::token_interface::mint_to(mint_ctx, rwa_amount)?;

    emit!(TokensMinted {
        asset: asset_key,
        user: ctx.accounts.user.key(),
        usdc_amount,
        rwa_amount,
        nav_bps,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct MintRwaToken<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"asset", rwa_mint.key().as_ref()],
        bump = asset_registry.bump,
    )]
    pub asset_registry: Account<'info, AssetRegistry>,

    #[account(
        seeds = [b"attestation", asset_registry.key().as_ref()],
        bump = attestation.bump,
    )]
    pub attestation: Account<'info, AttestationRecord>,

    /// Optional: only required when asset_registry.require_whitelist == true
    #[account(
        seeds = [b"whitelist", asset_registry.key().as_ref(), user.key().as_ref()],
        bump = whitelist_entry.bump,
    )]
    pub whitelist_entry: Option<Account<'info, WhitelistEntry>>,

    #[account(mut)]
    pub rwa_mint: InterfaceAccount<'info, Mint>,

    pub usdc_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = user,
    )]
    pub user_usdc: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = usdc_mint,
        associated_token::authority = asset_registry,
    )]
    pub vault_usdc: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = rwa_mint,
        associated_token::authority = user,
        associated_token::token_program = token_2022_program,
    )]
    pub user_rwa: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub token_2022_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
