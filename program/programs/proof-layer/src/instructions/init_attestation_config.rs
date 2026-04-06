use anchor_lang::prelude::*;

use crate::error::ProofLayerError;
use crate::events::AttestationConfigInitialized;
use crate::state::*;

pub fn handler(
    ctx: Context<InitAttestationConfig>,
    attestors: Vec<Pubkey>,
    threshold: u8,
    tolerance_bps: u16,
    validity_duration: i64,
) -> Result<()> {
    require!(attestors.len() <= 10, ProofLayerError::TooManyAttestors);
    require!(
        threshold > 0 && threshold as usize <= attestors.len(),
        ProofLayerError::InvalidThreshold
    );
    require!(tolerance_bps > 0, ProofLayerError::InvalidTolerance);
    require!(validity_duration > 0, ProofLayerError::InvalidValidityDuration);

    let clock = Clock::get()?;
    let config = &mut ctx.accounts.attestation_config;

    config.asset = ctx.accounts.asset_registry.key();
    config.authority = ctx.accounts.issuer.key();
    config.attestors = attestors.clone();
    config.threshold = threshold;
    config.tolerance_bps = tolerance_bps;
    config.validity_duration = validity_duration;
    config.current_round = 0;
    config.bump = ctx.bumps.attestation_config;

    emit!(AttestationConfigInitialized {
        asset: config.asset,
        authority: config.authority,
        attestors_count: attestors.len() as u8,
        threshold,
        tolerance_bps,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct InitAttestationConfig<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,

    #[account(
        has_one = issuer @ ProofLayerError::UnauthorizedIssuer,
    )]
    pub asset_registry: Account<'info, AssetRegistry>,

    #[account(
        init,
        payer = issuer,
        space = 8 + AttestationConfig::INIT_SPACE,
        seeds = [b"attestation_config", asset_registry.key().as_ref()],
        bump,
    )]
    pub attestation_config: Account<'info, AttestationConfig>,

    pub system_program: Program<'info, System>,
}
