import { AssetMetadata, AssetDocument, AssetType, InvestorTier, prisma } from "@prooflayer/shared";

function rowToMeta(row: {
  id: string;
  name: string;
  ticker: string;
  assetType: string;
  description: string;
  mintPubkey: string | null;
  onChainPubkey: string | null;
  metadata: unknown;
}): AssetMetadata {
  const blob = row.metadata as Partial<AssetMetadata>;
  return {
    assetId: row.id,
    name: row.name,
    ticker: row.ticker,
    assetType: row.assetType as AssetType,
    description: row.description,
    legalStructure: blob.legalStructure ?? { vehicleType: "", entityName: "", jurisdiction: "", investorRestrictions: [] },
    underlying: blob.underlying ?? { description: "" },
    counterparties: blob.counterparties ?? [],
    documents: blob.documents ?? [],
    fees: blob.fees ?? { managementFeeBps: 0, performanceFeeBps: 0, mintFeeBps: 0, redeemFeeBps: 0 },
    links: blob.links ?? {},
    imageUrl: blob.imageUrl,
    mintPubkey: row.mintPubkey ?? undefined,
    issuerPubkey: blob.issuerPubkey,
    updatedAt: blob.updatedAt ?? Date.now(),
  };
}

export class AssetMetaStore {
  async getByAssetId(assetId: string): Promise<AssetMetadata | undefined> {
    const row = await prisma.assetMeta.findUnique({ where: { id: assetId } });
    return row ? rowToMeta(row) : undefined;
  }

  async getAll(): Promise<AssetMetadata[]> {
    const rows = await prisma.assetMeta.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(rowToMeta);
  }

  async addDocument(assetId: string, doc: AssetDocument): Promise<AssetMetadata> {
    // Auto-create the asset record if it doesn't exist yet
    const meta = await this.getByAssetId(assetId) ?? await this.upsert(assetId, {});
    meta.documents.push(doc);
    return this.upsert(assetId, { documents: meta.documents });
  }

  async deleteAsset(assetId: string): Promise<boolean> {
    const existing = await prisma.assetMeta.findUnique({ where: { id: assetId } });
    if (!existing) return false;
    await prisma.assetMeta.delete({ where: { id: assetId } });
    return true;
  }

  async removeDocument(assetId: string, index: number): Promise<AssetMetadata | undefined> {
    const meta = await this.getByAssetId(assetId);
    if (!meta || index < 0 || index >= meta.documents.length) return undefined;
    meta.documents.splice(index, 1);
    return this.upsert(assetId, { documents: meta.documents });
  }

  async upsert(assetId: string, partial: Partial<AssetMetadata>): Promise<AssetMetadata> {
    const existing = await this.getByAssetId(assetId);
    const now = Date.now();

    const merged: AssetMetadata = existing
      ? {
          ...existing,
          ...partial,
          assetId,
          updatedAt: now,
          legalStructure: { ...existing.legalStructure, ...(partial.legalStructure ?? {}) },
          fees: { ...existing.fees, ...(partial.fees ?? {}) },
          links: { ...existing.links, ...(partial.links ?? {}) },
        }
      : {
          assetId,
          name: partial.name ?? assetId,
          ticker: partial.ticker ?? assetId.slice(0, 8).toUpperCase(),
          assetType: partial.assetType ?? AssetType.Treasury,
          description: partial.description ?? "",
          legalStructure: {
            vehicleType: "",
            entityName: partial.legalStructure?.entityName ?? "",
            jurisdiction: partial.legalStructure?.jurisdiction ?? "",
            investorRestrictions: [],
            ...partial.legalStructure,
          },
          underlying: partial.underlying ?? { description: "" },
          counterparties: partial.counterparties ?? [],
          documents: partial.documents ?? [],
          fees: {
            managementFeeBps: 0,
            performanceFeeBps: 0,
            mintFeeBps: 0,
            redeemFeeBps: 0,
            ...partial.fees,
          },
          links: partial.links ?? {},
          imageUrl: partial.imageUrl,
          mintPubkey: partial.mintPubkey,
          issuerPubkey: partial.issuerPubkey,
          updatedAt: now,
        };

    // The blob stores everything except the top-level indexed columns
    const { assetId: _id, name, ticker, assetType, description, mintPubkey, ...blob } = merged;

    await prisma.assetMeta.upsert({
      where: { id: assetId },
      create: {
        id: assetId,
        name,
        ticker,
        assetType,
        description,
        mintPubkey: mintPubkey ?? null,
        onChainPubkey: mintPubkey ?? null,
        metadata: blob as object,
        policyConfig: {},
      },
      update: {
        name,
        ticker,
        assetType,
        description,
        mintPubkey: mintPubkey ?? null,
        onChainPubkey: mintPubkey ?? null,
        metadata: blob as object,
      },
    });

    return merged;
  }

  getPolicyInfo(assetId: string, meta?: AssetMetadata) {
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
