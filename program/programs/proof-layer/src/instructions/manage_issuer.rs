use anchor_lang::prelude::*;

use crate::error::ProofLayerError;
use crate::events::IssuerApprovalChanged;
use crate::state::*;

pub fn handler_approve(ctx: Context<ApproveIssuer>, issuer: Pubkey) -> Result<()> {
    let clock = Clock::get()?;
    let entry = &mut ctx.accounts.approved_issuer;

    entry.issuer = issuer;
    entry.approved_at = clock.unix_timestamp;
    entry.bump = ctx.bumps.approved_issuer;

    emit!(IssuerApprovalChanged {
        issuer,
        approved: true,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn handler_revoke(ctx: Context<RevokeIssuer>) -> Result<()> {
    let clock = Clock::get()?;
    let issuer = ctx.accounts.approved_issuer.issuer;

    emit!(IssuerApprovalChanged {
        issuer,
        approved: false,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(issuer: Pubkey)]
pub struct ApproveIssuer<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [b"platform_config"],
        bump = platform_config.bump,
        has_one = admin @ ProofLayerError::UnauthorizedAdmin,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        init,
        payer = admin,
        space = 8 + ApprovedIssuer::INIT_SPACE,
        seeds = [b"approved_issuer", issuer.as_ref()],
        bump,
    )]
    pub approved_issuer: Account<'info, ApprovedIssuer>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeIssuer<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [b"platform_config"],
        bump = platform_config.bump,
        has_one = admin @ ProofLayerError::UnauthorizedAdmin,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        mut,
        close = admin,
    )]
    pub approved_issuer: Account<'info, ApprovedIssuer>,
}
