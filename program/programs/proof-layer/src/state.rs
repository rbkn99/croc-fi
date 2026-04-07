use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PlatformConfig {
    pub admin: Pubkey,
    pub platform_paused: bool,
    pub mint_fee_bps: u16,    // fee on mint, in bps (e.g. 50 = 0.5%)
    pub redeem_fee_bps: u16,  // fee on redeem, in bps
    pub fee_collector: Pubkey,
    pub require_issuer_approval: bool, // if true, only approved issuers can create assets
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ApprovedIssuer {
    pub issuer: Pubkey,
    pub approved_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum AssetType {
    Treasury,
    CorporateBond,
    MoneyMarket,
    Commodity,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum AssetStatus {
    Active,
    Paused,
    Redeemed,
}

#[account]
#[derive(InitSpace)]
pub struct AssetRegistry {
    pub issuer: Pubkey,
    pub mint: Pubkey,
    pub asset_type: AssetType,
    pub status: AssetStatus,
    pub created_at: i64,
    pub bump: u8,
    // Limits
    pub min_mint_amount: u64,
    pub min_redeem_amount: u64,
    pub daily_mint_limit: u64,   // 0 = no limit
    pub daily_redeem_limit: u64, // 0 = no limit
    // Daily tracking
    pub last_mint_day: i64,
    pub daily_minted: u64,
    pub last_redeem_day: i64,
    pub daily_redeemed: u64,
    // Whitelist enforcement (false = open access for all)
    pub require_whitelist: bool,
}

#[account]
#[derive(InitSpace)]
pub struct AttestationConfig {
    pub asset: Pubkey,
    pub authority: Pubkey,
    #[max_len(10)]
    pub attestors: Vec<Pubkey>,
    pub threshold: u8,
    pub tolerance_bps: u16,
    pub validity_duration: i64,
    pub current_round: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct AttestationVote {
    pub config: Pubkey,
    pub attestor: Pubkey,
    pub round: u64,
    pub nav_bps: u64,
    pub yield_rate_bps: u64,
    pub proof_hash: [u8; 32],
    pub submitted_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct AttestationRecord {
    pub asset: Pubkey,
    pub nav_bps: u64,
    pub yield_rate_bps: u64,
    pub proof_hash: [u8; 32],
    pub valid_until: i64,
    pub published_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct WhitelistEntry {
    pub asset: Pubkey,
    pub wallet: Pubkey,
    pub added_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct RedemptionRequest {
    pub asset: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
    pub requested_at: i64,
    pub bump: u8,
}
