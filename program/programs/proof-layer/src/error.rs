use anchor_lang::prelude::*;

#[error_code]
pub enum ProofLayerError {
    #[msg("Asset is paused")]
    AssetPaused,
    #[msg("Asset is not active")]
    AssetNotActive,
    #[msg("Attestation has expired")]
    StaleAttestation,
    #[msg("Recipient is not whitelisted")]
    NotWhitelisted,
    #[msg("Unauthorized: not the issuer")]
    UnauthorizedIssuer,
    #[msg("Unauthorized: not an authorized attestor")]
    UnauthorizedAttestor,
    #[msg("Invalid attestation validity window")]
    InvalidValidityWindow,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Not enough votes to finalize")]
    InsufficientVotes,
    #[msg("NAV values exceed tolerance from median")]
    ExceedsTolerance,
    #[msg("Duplicate vote from same attestor")]
    DuplicateVote,
    #[msg("Vote is for a different round")]
    WrongRound,
    #[msg("Threshold must be > 0 and <= number of attestors")]
    InvalidThreshold,
    #[msg("Too many attestors (max 10)")]
    TooManyAttestors,
    #[msg("Tolerance must be > 0")]
    InvalidTolerance,
    #[msg("Validity duration must be > 0")]
    InvalidValidityDuration,
    #[msg("Amount is below minimum")]
    BelowMinAmount,
    #[msg("Daily limit exceeded")]
    DailyLimitExceeded,
    #[msg("Unauthorized: not the platform admin")]
    UnauthorizedAdmin,
    #[msg("Platform is paused")]
    PlatformPaused,
    #[msg("Issuer is not approved")]
    IssuerNotApproved,
    #[msg("Fee exceeds maximum (10000 bps)")]
    FeeTooHigh,
}
