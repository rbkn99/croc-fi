use anchor_lang::prelude::*;

use crate::error::ProofLayerError;
use crate::state::*;

pub fn handler(ctx: Context<ToggleWhitelist>, require_whitelist: bool) -> Result<()> {
    ctx.accounts.asset_registry.require_whitelist = require_whitelist;
    Ok(())
}

#[derive(Accounts)]
pub struct ToggleWhitelist<'info> {
    pub issuer: Signer<'info>,

    #[account(
        mut,
        has_one = issuer @ ProofLayerError::UnauthorizedIssuer,
    )]
    pub asset_registry: Account<'info, AssetRegistry>,
}
