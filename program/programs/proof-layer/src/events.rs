use anchor_lang::prelude::*;

#[event]
pub struct PlatformInitialized {
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PlatformConfigUpdated {
    pub admin: Pubkey,
    pub mint_fee_bps: u16,
    pub redeem_fee_bps: u16,
    pub platform_paused: bool,
    pub timestamp: i64,
}

#[event]
pub struct IssuerApprovalChanged {
    pub issuer: Pubkey,
    pub approved: bool,
    pub timestamp: i64,
}

#[event]
pub struct AssetCreated {
    pub asset: Pubkey,
    pub issuer: Pubkey,
    pub mint: Pubkey,
    pub asset_type: u8,
    pub timestamp: i64,
}

#[event]
pub struct AttestationConfigInitialized {
    pub asset: Pubkey,
    pub authority: Pubkey,
    pub attestors_count: u8,
    pub threshold: u8,
    pub tolerance_bps: u16,
    pub timestamp: i64,
}

#[event]
pub struct NavVoteSubmitted {
    pub asset: Pubkey,
    pub attestor: Pubkey,
    pub round: u64,
    pub nav_bps: u64,
    pub yield_rate_bps: u64,
    pub timestamp: i64,
}

#[event]
pub struct AttestationFinalized {
    pub asset: Pubkey,
    pub round: u64,
    pub nav_bps: u64,
    pub yield_rate_bps: u64,
    pub valid_until: i64,
    pub votes_count: u8,
    pub timestamp: i64,
}

#[event]
pub struct AssetStatusChanged {
    pub asset: Pubkey,
    pub new_status: u8,
    pub timestamp: i64,
}

#[event]
pub struct WhitelistUpdated {
    pub asset: Pubkey,
    pub wallet: Pubkey,
    pub added: bool,
    pub timestamp: i64,
}

#[event]
pub struct TokensMinted {
    pub asset: Pubkey,
    pub user: Pubkey,
    pub usdc_amount: u64,
    pub rwa_amount: u64,
    pub nav_bps: u64,
    pub timestamp: i64,
}

#[event]
pub struct RedemptionQueued {
    pub asset: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct RedemptionFulfilled {
    pub asset: Pubkey,
    pub user: Pubkey,
    pub rwa_amount: u64,
    pub usdc_amount: u64,
    pub nav_bps: u64,
    pub timestamp: i64,
}

#[event]
pub struct RedemptionRejected {
    pub asset: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct VaultWithdrawal {
    pub asset: Pubkey,
    pub issuer: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct VaultDeposit {
    pub asset: Pubkey,
    pub issuer: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
