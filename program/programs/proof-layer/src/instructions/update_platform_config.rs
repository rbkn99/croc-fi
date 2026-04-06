use anchor_lang::prelude::*;

use crate::error::ProofLayerError;
use crate::events::PlatformConfigUpdated;
use crate::state::*;

pub fn handler(
    ctx: Context<UpdatePlatformConfig>,
    mint_fee_bps: Option<u16>,
    redeem_fee_bps: Option<u16>,
    fee_collector: Option<Pubkey>,
    platform_paused: Option<bool>,
    require_issuer_approval: Option<bool>,
    new_admin: Option<Pubkey>,
) -> Result<()> {
    let clock = Clock::get()?;
    let config = &mut ctx.accounts.platform_config;

    if let Some(fee) = mint_fee_bps {
        require!(fee <= 10_000, ProofLayerError::FeeTooHigh);
        config.mint_fee_bps = fee;
    }
    if let Some(fee) = redeem_fee_bps {
        require!(fee <= 10_000, ProofLayerError::FeeTooHigh);
        config.redeem_fee_bps = fee;
    }
    if let Some(collector) = fee_collector {
        config.fee_collector = collector;
    }
    if let Some(paused) = platform_paused {
        config.platform_paused = paused;
    }
    if let Some(require_approval) = require_issuer_approval {
        config.require_issuer_approval = require_approval;
    }
    if let Some(admin) = new_admin {
        config.admin = admin;
    }

    emit!(PlatformConfigUpdated {
        admin: config.admin,
        mint_fee_bps: config.mint_fee_bps,
        redeem_fee_bps: config.redeem_fee_bps,
        platform_paused: config.platform_paused,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct UpdatePlatformConfig<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"platform_config"],
        bump = platform_config.bump,
        has_one = admin @ ProofLayerError::UnauthorizedAdmin,
    )]
    pub platform_config: Account<'info, PlatformConfig>,
}
