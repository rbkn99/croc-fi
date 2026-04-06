use anchor_lang::prelude::*;

use crate::error::ProofLayerError;
use crate::events::AssetStatusChanged;
use crate::state::*;

pub fn handler_pause(ctx: Context<UpdateAssetStatus>) -> Result<()> {
    let clock = Clock::get()?;
    ctx.accounts.asset_registry.status = AssetStatus::Paused;

    emit!(AssetStatusChanged {
        asset: ctx.accounts.asset_registry.key(),
        new_status: AssetStatus::Paused as u8,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn handler_resume(ctx: Context<UpdateAssetStatus>) -> Result<()> {
    let clock = Clock::get()?;
    ctx.accounts.asset_registry.status = AssetStatus::Active;

    emit!(AssetStatusChanged {
        asset: ctx.accounts.asset_registry.key(),
        new_status: AssetStatus::Active as u8,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Admin can force-pause any asset
pub fn handler_admin_pause(ctx: Context<AdminUpdateAssetStatus>) -> Result<()> {
    let clock = Clock::get()?;
    ctx.accounts.asset_registry.status = AssetStatus::Paused;

    emit!(AssetStatusChanged {
        asset: ctx.accounts.asset_registry.key(),
        new_status: AssetStatus::Paused as u8,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateAssetStatus<'info> {
    pub issuer: Signer<'info>,

    #[account(
        mut,
        has_one = issuer @ ProofLayerError::UnauthorizedIssuer,
    )]
    pub asset_registry: Account<'info, AssetRegistry>,
}

#[derive(Accounts)]
pub struct AdminUpdateAssetStatus<'info> {
    pub admin: Signer<'info>,

    #[account(
        seeds = [b"platform_config"],
        bump = platform_config.bump,
        has_one = admin @ ProofLayerError::UnauthorizedAdmin,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(mut)]
    pub asset_registry: Account<'info, AssetRegistry>,
}
