import { AssetMetadata, AssetDocument, AssetType, InvestorTier } from "@prooflayer/shared";

const MOCK_MTBILL: AssetMetadata = {
  assetId: "mtbill-sol",
  name: "mTBILL",
  ticker: "mTBILL",
  assetType: AssetType.Treasury,
  description:
    "Tokenized US Treasury product with native yield accrual via Token-2022 InterestBearingMint. Backed by short-duration T-Bills (0–6 month maturity), custodied at a qualified custodian, with daily NAV attestation on-chain.",
  legalStructure: {
    vehicleType: "Delaware Statutory Trust",
    entityName: "ProofLayer Treasury Trust I",
    jurisdiction: "United States — Delaware",
    regulator: "SEC (Exempt under Reg D 506(c))",
    registrationNumber: "DST-2025-PL-001",
    inceptionDate: "2025-09-15",
    investorRestrictions: [
      "Accredited Investors only (SEC Reg D 506(c))",
      "US persons permitted with verification",
      "Non-US persons subject to jurisdiction screening",
      "OFAC/sanctions screening required",
    ],
    taxTreatment:
      "Token holders receive a K-1 allocation. Interest income treated as ordinary income for US taxpayers.",
  },
  underlying: {
    description:
      "Portfolio of US Treasury Bills with weighted average maturity under 6 months. Holdings selected for maximum liquidity and minimal credit risk.",
    benchmark: "ICE BofA US 3-Month Treasury Bill Index",
    maturityRange: "0–26 weeks",
    creditRating: "Sovereign (AA+ / Aaa)",
    averageDuration: "~90 days",
    concentrationLimit: "Max 25% in any single CUSIP",
  },
  counterparties: [
    {
      role: "custodian",
      name: "Anchorage Digital",
      jurisdiction: "United States",
      url: "https://www.anchorage.com",
      description:
        "Federally-chartered digital asset bank providing qualified custody for fund assets.",
    },
    {
      role: "nav_agent",
      name: "NAV Consulting",
      jurisdiction: "United States",
      url: "https://www.navconsulting.net",
      description:
        "Independent NAV calculation agent. Daily NAV strike fed to ProofLayer attestor.",
    },
    {
      role: "auditor",
      name: "Armanino LLP",
      jurisdiction: "United States",
      url: "https://www.armanino.com",
      description:
        "Annual audit of fund financials and proof-of-reserve attestations.",
    },
    {
      role: "legal_counsel",
      name: "Debevoise & Plimpton LLP",
      jurisdiction: "United States",
      url: "https://www.debevoise.com",
      description: "Fund formation, securities law, and regulatory counsel.",
    },
    {
      role: "fund_admin",
      name: "MG Stover",
      jurisdiction: "United States",
      url: "https://www.mgstover.com",
      description:
        "Fund administration, investor reporting, and subscription/redemption processing.",
    },
    {
      role: "transfer_agent",
      name: "ProofLayer Protocol",
      jurisdiction: "N/A (on-chain)",
      description:
        "On-chain transfer agent via Token-2022 TransferHook. Enforces whitelist, attestation freshness, and asset status on every transfer.",
    },
  ],
  documents: [
    {
      title: "Private Placement Memorandum (PPM)",
      type: "prospectus",
      url: "https://docs.prooflayer.io/mtbill/ppm-v1.pdf",
      publishedAt: "2025-09-01",
    },
    {
      title: "Fund Fact Sheet — Q1 2026",
      type: "fact_sheet",
      url: "https://docs.prooflayer.io/mtbill/factsheet-q1-2026.pdf",
      publishedAt: "2026-04-01",
    },
    {
      title: "Proof of Reserve Attestation — March 2026",
      type: "audit_report",
      url: "https://docs.prooflayer.io/mtbill/por-march-2026.pdf",
      publishedAt: "2026-03-31",
      hash: "a3f8c0d1e2b4f5a6c7d8e9f0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9",
    },
    {
      title: "Legal Opinion — Token Classification",
      type: "legal_opinion",
      url: "https://docs.prooflayer.io/mtbill/legal-opinion-token.pdf",
      publishedAt: "2025-08-20",
    },
    {
      title: "Subscription Agreement Template",
      type: "subscription_agreement",
      url: "https://docs.prooflayer.io/mtbill/subscription-agreement.pdf",
      publishedAt: "2025-09-01",
    },
    {
      title: "Tax Memo — US Investor Treatment",
      type: "tax_memo",
      url: "https://docs.prooflayer.io/mtbill/tax-memo-us.pdf",
      publishedAt: "2025-09-10",
    },
  ],
  fees: {
    managementFeeBps: 35,
    performanceFeeBps: 0,
    mintFeeBps: 5,
    redeemFeeBps: 5,
  },
  links: {
    website: "https://prooflayer.io",
    explorer: "https://solscan.io/token/mTBILL...",
    github: "https://github.com/prooflayer",
  },
  updatedAt: Date.now(),
};

const MOCK_MYIELD: AssetMetadata = {
  assetId: "myield-sol",
  name: "mYIELD",
  ticker: "mYIELD",
  assetType: AssetType.MoneyMarket,
  description:
    "Diversified money market fund token backed by institutional-grade short-term lending strategies and cash equivalents.",
  legalStructure: {
    vehicleType: "Cayman Islands Exempted Company",
    entityName: "ProofLayer Yield Fund Ltd.",
    jurisdiction: "Cayman Islands",
    regulator: "CIMA (Registered Fund)",
    registrationNumber: "CYF-2025-PL-002",
    inceptionDate: "2025-11-01",
    investorRestrictions: [
      "Qualified Purchasers and institutional investors",
      "Non-US persons (Reg S exemption)",
      "Minimum investment: $100,000",
    ],
    taxTreatment:
      "Offshore fund structure; investors responsible for own tax reporting based on jurisdiction.",
  },
  underlying: {
    description:
      "Diversified portfolio of institutional money market instruments, commercial paper, and repo agreements.",
    benchmark: "ICE BofA US 3-Month Treasury Bill Index + 200bps",
    maturityRange: "1–90 days",
    creditRating: "A-1 / P-1 (commercial paper)",
    averageDuration: "~30 days",
    concentrationLimit: "Max 10% per counterparty",
  },
  counterparties: [
    {
      role: "custodian",
      name: "BitGo Trust",
      jurisdiction: "United States",
      url: "https://www.bitgo.com",
      description: "Qualified custodian for digital asset collateral.",
    },
    {
      role: "nav_agent",
      name: "NAV Consulting",
      jurisdiction: "United States",
      url: "https://www.navconsulting.net",
    },
    {
      role: "auditor",
      name: "PwC Cayman",
      jurisdiction: "Cayman Islands",
      url: "https://www.pwc.com",
    },
    {
      role: "fund_admin",
      name: "Apex Group",
      jurisdiction: "Cayman Islands",
      url: "https://www.apexgroup.com",
    },
  ],
  documents: [
    {
      title: "Offering Memorandum",
      type: "prospectus",
      url: "https://docs.prooflayer.io/myield/om-v1.pdf",
      publishedAt: "2025-10-15",
    },
    {
      title: "Fund Fact Sheet — Q1 2026",
      type: "fact_sheet",
      url: "https://docs.prooflayer.io/myield/factsheet-q1-2026.pdf",
      publishedAt: "2026-04-01",
    },
  ],
  fees: {
    managementFeeBps: 75,
    performanceFeeBps: 1000,
    mintFeeBps: 10,
    redeemFeeBps: 10,
  },
  links: {
    website: "https://prooflayer.io",
  },
  updatedAt: Date.now(),
};

const MOCK_MCORP: AssetMetadata = {
  assetId: "mcorp-sol",
  name: "mCORP",
  ticker: "mCORP",
  assetType: AssetType.CorporateBond,
  description:
    "Investment-grade corporate bond exposure on-chain. Higher yield with ProofLayer compliance enforcement and daily attestation.",
  legalStructure: {
    vehicleType: "BVI Business Company (SPV)",
    entityName: "ProofLayer Credit SPV Ltd.",
    jurisdiction: "British Virgin Islands",
    regulator: "BVI FSC (Exempt)",
    registrationNumber: "BVI-2026-PL-003",
    inceptionDate: "2026-01-15",
    investorRestrictions: [
      "Accredited / Professional Investors only",
      "Minimum investment: $50,000",
      "Lock-up period: 30 days",
    ],
    taxTreatment: "Tax-neutral SPV; pass-through to investors.",
  },
  underlying: {
    description:
      "Portfolio of investment-grade corporate bonds (BBB- and above) with focus on US and European issuers.",
    benchmark: "Bloomberg US Corporate Bond Index",
    maturityRange: "1–5 years",
    creditRating: "BBB- to A+ (investment grade)",
    averageDuration: "~2.5 years",
    concentrationLimit: "Max 5% per issuer",
  },
  counterparties: [
    {
      role: "custodian",
      name: "Copper.co",
      jurisdiction: "United Kingdom",
      url: "https://copper.co",
    },
    {
      role: "auditor",
      name: "BDO BVI",
      jurisdiction: "British Virgin Islands",
      url: "https://www.bdo.vg",
    },
  ],
  documents: [
    {
      title: "Information Memorandum",
      type: "prospectus",
      url: "https://docs.prooflayer.io/mcorp/im-v1.pdf",
      publishedAt: "2026-01-10",
    },
  ],
  fees: {
    managementFeeBps: 50,
    performanceFeeBps: 500,
    mintFeeBps: 10,
    redeemFeeBps: 15,
  },
  links: {
    website: "https://prooflayer.io",
  },
  updatedAt: Date.now(),
};

const METADATA_STORE: Map<string, AssetMetadata> = new Map([
  ["mtbill-sol", MOCK_MTBILL],
  ["myield-sol", MOCK_MYIELD],
  ["mcorp-sol", MOCK_MCORP],
]);

export class AssetMetaStore {
  getByAssetId(assetId: string): AssetMetadata | undefined {
    return METADATA_STORE.get(assetId);
  }

  getAll(): AssetMetadata[] {
    return Array.from(METADATA_STORE.values());
  }

  addDocument(assetId: string, doc: AssetDocument): AssetMetadata | undefined {
    const meta = METADATA_STORE.get(assetId);
    if (!meta) return undefined;
    meta.documents.push(doc);
    meta.updatedAt = Date.now();
    return meta;
  }

  removeDocument(assetId: string, index: number): AssetMetadata | undefined {
    const meta = METADATA_STORE.get(assetId);
    if (!meta || index < 0 || index >= meta.documents.length) return undefined;
    meta.documents.splice(index, 1);
    meta.updatedAt = Date.now();
    return meta;
  }

  getPolicyInfo(assetId: string) {
    const meta = METADATA_STORE.get(assetId);
    if (!meta) return undefined;

    return {
      assetId: meta.assetId,
      name: meta.name,
      transferHookEnforced: true,
      requireKyc: true,
      requiredTier: InvestorTier.Accredited,
      investorRestrictions: meta.legalStructure.investorRestrictions,
      attestationRequirement: {
        requireFresh: true,
        maxAgeSec: 86400,
        source: "ProofLayer Attestor (NAV agent → on-chain)",
      },
      whitelistModel: "on-chain PDA per wallet per asset",
      complianceChecks: [
        "KYC/AML verification via provider",
        "Investor tier ≥ Accredited",
        "Jurisdiction screening (OFAC/sanctions)",
        "Attestation freshness on every transfer",
        "Asset active status check on every transfer",
        "Whitelist PDA existence check on every transfer",
      ],
      onChainEnforcement: {
        program: "proof_layer_hook (TransferHook)",
        checks: [
          "AssetRegistry.status == Active",
          "AttestationRecord.valid_until > now",
          "WhitelistEntry PDA exists for recipient",
        ],
      },
    };
  }
}
