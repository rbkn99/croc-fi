import { prisma } from "@prooflayer/shared/src/db";
import type { KycRecord as PrismaKycRecord, KycStatus as PrismaKycStatus, InvestorTier as PrismaInvestorTier } from "@prisma/client";
import { KycRecord, KycStatus, InvestorTier } from "@prooflayer/shared";

// Prisma enums → App enums mapping (values are identical strings,
// but TS treats them as distinct types)
const kycStatusMap: Record<PrismaKycStatus, KycStatus> = {
  pending: KycStatus.Pending,
  approved: KycStatus.Approved,
  rejected: KycStatus.Rejected,
  expired: KycStatus.Expired,
};

const investorTierMap: Record<PrismaInvestorTier, InvestorTier> = {
  retail: InvestorTier.Retail,
  accredited: InvestorTier.Accredited,
  qualified_purchaser: InvestorTier.QualifiedPurchaser,
  institutional: InvestorTier.Institutional,
};

// App enums → Prisma enums (reverse)
const kycStatusToPrisma: Record<KycStatus, PrismaKycStatus> = {
  [KycStatus.Pending]: "pending",
  [KycStatus.Approved]: "approved",
  [KycStatus.Rejected]: "rejected",
  [KycStatus.Expired]: "expired",
};

const investorTierToPrisma: Record<InvestorTier, PrismaInvestorTier> = {
  [InvestorTier.Retail]: "retail",
  [InvestorTier.Accredited]: "accredited",
  [InvestorTier.QualifiedPurchaser]: "qualified_purchaser",
  [InvestorTier.Institutional]: "institutional",
};

function toAppRecord(r: PrismaKycRecord): KycRecord {
  return {
    wallet: r.wallet,
    externalId: r.externalId ?? "",
    provider: r.provider,
    status: kycStatusMap[r.status],
    tier: investorTierMap[r.tier],
    jurisdiction: r.jurisdiction ?? "unknown",
    verifiedAt: r.verifiedAt ? Math.floor(r.verifiedAt.getTime() / 1000) : null,
    expiresAt: r.expiresAt ? Math.floor(r.expiresAt.getTime() / 1000) : null,
    rejectionReason: r.rejectionReason ?? null,
    createdAt: Math.floor(r.createdAt.getTime() / 1000),
    updatedAt: Math.floor(r.updatedAt.getTime() / 1000),
  };
}

function tsToDate(ts: number | null | undefined): Date | null {
  if (ts == null) return null;
  return new Date(ts * 1000);
}

export const kycStore = {
  async get(wallet: string): Promise<KycRecord | null> {
    const r = await prisma.kycRecord.findUnique({ where: { wallet } });
    return r ? toAppRecord(r) : null;
  },

  async upsert(wallet: string, update: Partial<KycRecord>): Promise<KycRecord> {
    const prismaStatus = update.status ? kycStatusToPrisma[update.status] : undefined;
    const prismaTier = update.tier ? investorTierToPrisma[update.tier] : undefined;

    const data = {
      externalId: update.externalId,
      provider: update.provider,
      status: prismaStatus,
      tier: prismaTier,
      jurisdiction: update.jurisdiction,
      verifiedAt: tsToDate(update.verifiedAt),
      expiresAt: tsToDate(update.expiresAt),
      rejectionReason: update.rejectionReason,
    };

    // Remove undefined keys so Prisma doesn't overwrite with null
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    const r = await prisma.kycRecord.upsert({
      where: { wallet },
      create: {
        wallet,
        provider: update.provider ?? "manual",
        ...cleanData,
      },
      update: cleanData,
    });

    return toAppRecord(r);
  },

  async getApproved(): Promise<KycRecord[]> {
    const records = await prisma.kycRecord.findMany({
      where: {
        status: "approved",
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });
    return records.map(toAppRecord);
  },

  async getExpiring(withinSeconds: number): Promise<KycRecord[]> {
    const now = new Date();
    const threshold = new Date(Date.now() + withinSeconds * 1000);
    const records = await prisma.kycRecord.findMany({
      where: {
        status: "approved",
        expiresAt: { not: null, gt: now, lte: threshold },
      },
    });
    return records.map(toAppRecord);
  },

  async getExpired(): Promise<KycRecord[]> {
    const records = await prisma.kycRecord.findMany({
      where: {
        status: "approved",
        expiresAt: { not: null, lte: new Date() },
      },
    });
    return records.map(toAppRecord);
  },

  async setExpired(wallet: string): Promise<void> {
    await prisma.kycRecord.update({
      where: { wallet },
      data: { status: "expired" },
    });
  },

  async all(): Promise<KycRecord[]> {
    const records = await prisma.kycRecord.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return records.map(toAppRecord);
  },
};
