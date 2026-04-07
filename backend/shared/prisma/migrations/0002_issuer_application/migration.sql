-- CreateTable
CREATE TABLE "IssuerApplication" (
    "id" TEXT NOT NULL,
    "mintPubkey" TEXT NOT NULL,
    "issuerWallet" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "jurisdiction" TEXT,
    "assetType" TEXT NOT NULL,
    "aumEstimate" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "minMintAmount" INTEGER NOT NULL DEFAULT 0,
    "minRedeemAmount" INTEGER NOT NULL DEFAULT 0,
    "dailyMintLimit" INTEGER NOT NULL DEFAULT 0,
    "dailyRedeemLimit" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssuerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IssuerApplication_mintPubkey_key" ON "IssuerApplication"("mintPubkey");

-- CreateIndex
CREATE INDEX "IssuerApplication_issuerWallet_idx" ON "IssuerApplication"("issuerWallet");
