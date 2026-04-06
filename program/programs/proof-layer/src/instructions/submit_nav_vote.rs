use anchor_lang::prelude::*;

use crate::error::ProofLayerError;
use crate::events::NavVoteSubmitted;
use crate::state::*;

pub fn handler(
    ctx: Context<SubmitNavVote>,
    nav_bps: u64,
    yield_rate_bps: u64,
    proof_hash: [u8; 32],
) -> Result<()> {
    let config = &ctx.accounts.attestation_config;
    let attestor_key = ctx.accounts.attestor.key();

    require!(
        config.attestors.contains(&attestor_key),
        ProofLayerError::UnauthorizedAttestor
    );

    let clock = Clock::get()?;
    let vote = &mut ctx.accounts.attestation_vote;

    vote.config = config.key();
    vote.attestor = attestor_key;
    vote.round = config.current_round;
    vote.nav_bps = nav_bps;
    vote.yield_rate_bps = yield_rate_bps;
    vote.proof_hash = proof_hash;
    vote.submitted_at = clock.unix_timestamp;
    vote.bump = ctx.bumps.attestation_vote;

    emit!(NavVoteSubmitted {
        asset: config.asset,
        attestor: attestor_key,
        round: config.current_round,
        nav_bps,
        yield_rate_bps,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct SubmitNavVote<'info> {
    #[account(mut)]
    pub attestor: Signer<'info>,

    pub attestation_config: Account<'info, AttestationConfig>,

    #[account(
        init,
        payer = attestor,
        space = 8 + AttestationVote::INIT_SPACE,
        seeds = [
            b"vote",
            attestation_config.key().as_ref(),
            &attestation_config.current_round.to_le_bytes(),
            attestor.key().as_ref(),
        ],
        bump,
    )]
    pub attestation_vote: Account<'info, AttestationVote>,

    pub system_program: Program<'info, System>,
}
