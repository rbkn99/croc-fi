use anchor_lang::prelude::*;

use crate::events::PlatformInitialized;
use crate::state::*;

pub fn handler(ctx: Context<InitializePlatform>, fee_collector: Pubkey) -> Result<()> {
    let clock = Clock::get()?;
    let config = &mut ctx.accounts.platform_config;

    config.admin = ctx.accounts.admin.key();
    config.platform_paused = false;
    config.mint_fee_bps = 0;
    config.redeem_fee_bps = 0;
    config.fee_collector = fee_collector;
    config.require_issuer_approval = false;
    config.bump = ctx.bumps.platform_config;

    emit!(PlatformInitialized {
        admin: config.admin,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + PlatformConfig::INIT_SPACE,
        seeds = [b"platform_config"],
        bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    pub system_program: Program<'info, System>,
}
