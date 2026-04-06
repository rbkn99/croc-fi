use anchor_lang::prelude::*;

use crate::error::ProofLayerError;
use crate::events::AttestationFinalized;
use crate::state::*;

pub fn handler(ctx: Context<FinalizeAttestation>) -> Result<()> {
    let config = &ctx.accounts.attestation_config;
    let current_round = config.current_round;
    let threshold = config.threshold as usize;
    let tolerance = config.tolerance_bps as u64;

    // Collect votes from remaining accounts
    let mut nav_values: Vec<u64> = Vec::new();
    let mut yield_values: Vec<u64> = Vec::new();
    let mut combined_proof: [u8; 32] = [0u8; 32];
    let mut seen_attestors: Vec<Pubkey> = Vec::new();

    for account_info in ctx.remaining_accounts.iter() {
        let data = account_info.try_borrow_data()?;
        // Skip 8-byte discriminator
        let vote = AttestationVote::try_deserialize(&mut &data[..])?;

        require!(vote.round == current_round, ProofLayerError::WrongRound);
        require!(
            config.attestors.contains(&vote.attestor),
            ProofLayerError::UnauthorizedAttestor
        );
        require!(
            !seen_attestors.contains(&vote.attestor),
            ProofLayerError::DuplicateVote
        );

        seen_attestors.push(vote.attestor);
        nav_values.push(vote.nav_bps);
        yield_values.push(vote.yield_rate_bps);

        for i in 0..32 {
            combined_proof[i] ^= vote.proof_hash[i];
        }
    }

    require!(nav_values.len() >= threshold, ProofLayerError::InsufficientVotes);

    // Compute medians
    let nav_median = compute_median(&mut nav_values);
    let yield_median = compute_median(&mut yield_values);

    // Check NAV tolerance — each value must be within tolerance_bps of median
    for &nav in &nav_values {
        let diff = if nav > nav_median {
            nav - nav_median
        } else {
            nav_median - nav
        };
        let max_diff = nav_median
            .checked_mul(tolerance)
            .ok_or(ProofLayerError::Overflow)?
            / 10_000;
        require!(diff <= max_diff, ProofLayerError::ExceedsTolerance);
    }

    let clock = Clock::get()?;
    let valid_until = clock
        .unix_timestamp
        .checked_add(config.validity_duration)
        .ok_or(ProofLayerError::Overflow)?;

    // Write finalized attestation
    let attestation = &mut ctx.accounts.attestation;
    attestation.asset = ctx.accounts.asset_registry.key();
    attestation.nav_bps = nav_median;
    attestation.yield_rate_bps = yield_median;
    attestation.proof_hash = combined_proof;
    attestation.valid_until = valid_until;
    attestation.published_at = clock.unix_timestamp;
    attestation.bump = ctx.bumps.attestation;

    // Increment round
    let config = &mut ctx.accounts.attestation_config;
    config.current_round = current_round + 1;

    emit!(AttestationFinalized {
        asset: attestation.asset,
        round: current_round,
        nav_bps: nav_median,
        yield_rate_bps: yield_median,
        valid_until,
        votes_count: seen_attestors.len() as u8,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

fn compute_median(values: &mut [u64]) -> u64 {
    values.sort();
    let len = values.len();
    if len % 2 == 0 {
        // Average of two middle values
        values[len / 2 - 1] / 2 + values[len / 2] / 2
    } else {
        values[len / 2]
    }
}

#[derive(Accounts)]
pub struct FinalizeAttestation<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub asset_registry: Account<'info, AssetRegistry>,

    #[account(
        mut,
        seeds = [b"attestation_config", asset_registry.key().as_ref()],
        bump = attestation_config.bump,
    )]
    pub attestation_config: Account<'info, AttestationConfig>,

    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + AttestationRecord::INIT_SPACE,
        seeds = [b"attestation", asset_registry.key().as_ref()],
        bump,
    )]
    pub attestation: Account<'info, AttestationRecord>,

    pub system_program: Program<'info, System>,
}
