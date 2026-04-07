use anchor_lang::prelude::*;

pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;
use state::*;

declare_id!("croZ9hcrqGz3fZHTkBfEaRbZQXkhfW4ZhbVBiFinNrF");

#[program]
pub mod proof_layer {
    use super::*;

    // ── Platform admin ──────────────────────────────────────────

    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        fee_collector: Pubkey,
    ) -> Result<()> {
        instructions::initialize_platform::handler(ctx, fee_collector)
    }

    pub fn update_platform_config(
        ctx: Context<UpdatePlatformConfig>,
        mint_fee_bps: Option<u16>,
        redeem_fee_bps: Option<u16>,
        fee_collector: Option<Pubkey>,
        platform_paused: Option<bool>,
        require_issuer_approval: Option<bool>,
        new_admin: Option<Pubkey>,
    ) -> Result<()> {
        instructions::update_platform_config::handler(
            ctx,
            mint_fee_bps,
            redeem_fee_bps,
            fee_collector,
            platform_paused,
            require_issuer_approval,
            new_admin,
        )
    }

    pub fn approve_issuer(ctx: Context<ApproveIssuer>, issuer: Pubkey) -> Result<()> {
        instructions::manage_issuer::handler_approve(ctx, issuer)
    }

    pub fn revoke_issuer(ctx: Context<RevokeIssuer>) -> Result<()> {
        instructions::manage_issuer::handler_revoke(ctx)
    }

    pub fn admin_pause_asset(ctx: Context<AdminUpdateAssetStatus>) -> Result<()> {
        instructions::update_asset_status::handler_admin_pause(ctx)
    }

    // ── Asset management ────────────────────────────────────────

    pub fn create_asset(
        ctx: Context<CreateAsset>,
        asset_type: AssetType,
        min_mint_amount: u64,
        min_redeem_amount: u64,
        daily_mint_limit: u64,
        daily_redeem_limit: u64,
    ) -> Result<()> {
        instructions::create_asset::handler(
            ctx,
            asset_type,
            min_mint_amount,
            min_redeem_amount,
            daily_mint_limit,
            daily_redeem_limit,
        )
    }

    pub fn pause_asset(ctx: Context<UpdateAssetStatus>) -> Result<()> {
        instructions::update_asset_status::handler_pause(ctx)
    }

    pub fn resume_asset(ctx: Context<UpdateAssetStatus>) -> Result<()> {
        instructions::update_asset_status::handler_resume(ctx)
    }

    // ── Attestation ─────────────────────────────────────────────

    pub fn init_attestation_config(
        ctx: Context<InitAttestationConfig>,
        attestors: Vec<Pubkey>,
        threshold: u8,
        tolerance_bps: u16,
        validity_duration: i64,
    ) -> Result<()> {
        instructions::init_attestation_config::handler(
            ctx,
            attestors,
            threshold,
            tolerance_bps,
            validity_duration,
        )
    }

    pub fn submit_nav_vote(
        ctx: Context<SubmitNavVote>,
        nav_bps: u64,
        yield_rate_bps: u64,
        proof_hash: [u8; 32],
    ) -> Result<()> {
        instructions::submit_nav_vote::handler(ctx, nav_bps, yield_rate_bps, proof_hash)
    }

    pub fn finalize_attestation(ctx: Context<FinalizeAttestation>) -> Result<()> {
        instructions::finalize_attestation::handler(ctx)
    }

    pub fn toggle_whitelist(ctx: Context<ToggleWhitelist>, require_whitelist: bool) -> Result<()> {
        instructions::toggle_whitelist::handler(ctx, require_whitelist)
    }

    // ── Whitelist ───────────────────────────────────────────────

    pub fn add_to_whitelist(ctx: Context<AddToWhitelist>, wallet: Pubkey) -> Result<()> {
        instructions::whitelist::handler_add(ctx, wallet)
    }

    pub fn remove_from_whitelist(ctx: Context<RemoveFromWhitelist>) -> Result<()> {
        instructions::whitelist::handler_remove(ctx)
    }

    // ── Mint / Redeem ───────────────────────────────────────────

    pub fn mint_rwa_token(ctx: Context<MintRwaToken>, usdc_amount: u64) -> Result<()> {
        instructions::mint_rwa_token::handler(ctx, usdc_amount)
    }

    pub fn redeem_rwa_token(ctx: Context<RedeemRwaToken>, amount: u64) -> Result<()> {
        instructions::redeem_rwa_token::handler(ctx, amount)
    }

    pub fn fulfill_redemption(ctx: Context<FulfillRedemption>) -> Result<()> {
        instructions::fulfill_redemption::handler(ctx)
    }

    pub fn reject_redemption(ctx: Context<RejectRedemption>) -> Result<()> {
        instructions::reject_redemption::handler(ctx)
    }

    // ── Vault ───────────────────────────────────────────────────

    pub fn withdraw_from_vault(ctx: Context<WithdrawFromVault>, amount: u64) -> Result<()> {
        instructions::withdraw_from_vault::handler(ctx, amount)
    }

    pub fn deposit_to_vault(ctx: Context<DepositToVault>, amount: u64) -> Result<()> {
        instructions::deposit_to_vault::handler(ctx, amount)
    }
}
