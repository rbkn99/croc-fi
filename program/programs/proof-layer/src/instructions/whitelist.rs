use anchor_lang::prelude::*;

use crate::error::ProofLayerError;
use crate::events::WhitelistUpdated;
use crate::state::*;

pub fn handler_add(ctx: Context<AddToWhitelist>, wallet: Pubkey) -> Result<()> {
    let entry = &mut ctx.accounts.whitelist_entry;
    let clock = Clock::get()?;

    entry.asset = ctx.accounts.asset_registry.key();
    entry.wallet = wallet;
    entry.added_at = clock.unix_timestamp;
    entry.bump = ctx.bumps.whitelist_entry;

    emit!(WhitelistUpdated {
        asset: entry.asset,
        wallet,
        added: true,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn handler_remove(ctx: Context<RemoveFromWhitelist>) -> Result<()> {
    let clock = Clock::get()?;

    emit!(WhitelistUpdated {
        asset: ctx.accounts.asset_registry.key(),
        wallet: ctx.accounts.whitelist_entry.wallet,
        added: false,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(wallet: Pubkey)]
pub struct AddToWhitelist<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,

    #[account(
        has_one = issuer @ ProofLayerError::UnauthorizedIssuer,
    )]
    pub asset_registry: Account<'info, AssetRegistry>,

    #[account(
        init,
        payer = issuer,
        space = 8 + WhitelistEntry::INIT_SPACE,
        seeds = [b"whitelist", asset_registry.key().as_ref(), wallet.as_ref()],
        bump,
    )]
    pub whitelist_entry: Account<'info, WhitelistEntry>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveFromWhitelist<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,

    #[account(
        has_one = issuer @ ProofLayerError::UnauthorizedIssuer,
    )]
    pub asset_registry: Account<'info, AssetRegistry>,

    #[account(
        mut,
        close = issuer,
        seeds = [b"whitelist", asset_registry.key().as_ref(), whitelist_entry.wallet.as_ref()],
        bump = whitelist_entry.bump,
    )]
    pub whitelist_entry: Account<'info, WhitelistEntry>,
}
