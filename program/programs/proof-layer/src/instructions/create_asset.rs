use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

use crate::error::ProofLayerError;
use crate::events::AssetCreated;
use crate::state::*;

pub fn handler(
    ctx: Context<CreateAsset>,
    asset_type: AssetType,
    min_mint_amount: u64,
    min_redeem_amount: u64,
    daily_mint_limit: u64,
    daily_redeem_limit: u64,
) -> Result<()> {
    let platform = &ctx.accounts.platform_config;

    // Platform must not be paused
    require!(!platform.platform_paused, ProofLayerError::PlatformPaused);

    // If issuer approval is required, check approved_issuer PDA exists
    if platform.require_issuer_approval {
        require!(
            ctx.accounts.approved_issuer.is_some(),
            ProofLayerError::IssuerNotApproved
        );
    }

    let asset = &mut ctx.accounts.asset_registry;
    let clock = Clock::get()?;

    asset.issuer = ctx.accounts.issuer.key();
    asset.mint = ctx.accounts.rwa_mint.key();
    asset.asset_type = asset_type;
    asset.status = AssetStatus::Active;
    asset.created_at = clock.unix_timestamp;
    asset.bump = ctx.bumps.asset_registry;
    asset.min_mint_amount = min_mint_amount;
    asset.min_redeem_amount = min_redeem_amount;
    asset.daily_mint_limit = daily_mint_limit;
    asset.daily_redeem_limit = daily_redeem_limit;
    asset.last_mint_day = 0;
    asset.daily_minted = 0;
    asset.last_redeem_day = 0;
    asset.daily_redeemed = 0;

    emit!(AssetCreated {
        asset: asset.key(),
        issuer: asset.issuer,
        mint: asset.mint,
        asset_type: asset_type as u8,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CreateAsset<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,

    pub rwa_mint: InterfaceAccount<'info, Mint>,

    #[account(
        seeds = [b"platform_config"],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    /// Optional: only required when platform_config.require_issuer_approval == true
    #[account(
        seeds = [b"approved_issuer", issuer.key().as_ref()],
        bump = approved_issuer.bump,
    )]
    pub approved_issuer: Option<Account<'info, ApprovedIssuer>>,

    #[account(
        init,
        payer = issuer,
        space = 8 + AssetRegistry::INIT_SPACE,
        seeds = [b"asset", rwa_mint.key().as_ref()],
        bump,
    )]
    pub asset_registry: Account<'info, AssetRegistry>,

    pub system_program: Program<'info, System>,
}
