-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "InvestorTier" AS ENUM ('retail', 'accredited', 'qualified_purchaser', 'institutional');

-- CreateTable
CREATE TABLE "KycRecord" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "externalId" TEXT,
    "provider" TEXT NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'pending',
    "tier" "InvestorTier" NOT NULL DEFAULT 'retail',
    "jurisdiction" TEXT,
    "rejectionReason" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhitelistSync" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "assetPubkey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "txSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhitelistSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetMeta" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "onChainPubkey" TEXT,
    "mintPubkey" TEXT,
    "metadata" JSONB NOT NULL,
    "policyConfig" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetMeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEntry" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "target" TEXT,
    "details" JSONB,
    "txSignature" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kycWallet" TEXT,

    CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "tier" "InvestorTier" NOT NULL DEFAULT 'institutional',
    "jurisdiction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionMember" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "institutionId" TEXT NOT NULL,

    CONSTRAINT "InstitutionMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KycRecord_wallet_key" ON "KycRecord"("wallet");

-- CreateIndex
CREATE INDEX "WhitelistSync_wallet_assetPubkey_idx" ON "WhitelistSync"("wallet", "assetPubkey");

-- CreateIndex
CREATE INDEX "AuditEntry_action_idx" ON "AuditEntry"("action");

-- CreateIndex
CREATE INDEX "AuditEntry_actor_idx" ON "AuditEntry"("actor");

-- CreateIndex
CREATE INDEX "AuditEntry_timestamp_idx" ON "AuditEntry"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_wallet_key" ON "Institution"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionMember_wallet_key" ON "InstitutionMember"("wallet");

-- CreateIndex
CREATE INDEX "InstitutionMember_institutionId_idx" ON "InstitutionMember"("institutionId");

-- AddForeignKey
ALTER TABLE "WhitelistSync" ADD CONSTRAINT "WhitelistSync_wallet_fkey" FOREIGN KEY ("wallet") REFERENCES "KycRecord"("wallet") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_kycWallet_fkey" FOREIGN KEY ("kycWallet") REFERENCES "KycRecord"("wallet") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionMember" ADD CONSTRAINT "InstitutionMember_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

