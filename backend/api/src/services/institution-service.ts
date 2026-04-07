import { Connection, PublicKey } from "@solana/web3.js";
import { prisma } from "@prooflayer/shared";
import { AssetMetaStore } from "./asset-meta-store";

export class InstitutionService {
  private connection: Connection;
  private metaStore: AssetMetaStore;

  constructor(rpcUrl: string, metaStore: AssetMetaStore) {
    this.connection = new Connection(rpcUrl, "confirmed");
    this.metaStore = metaStore;
  }

  async getProfile(institutionId: string) {
    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      include: { members: true },
    });
    if (!institution) return null;

    return {
      id: institution.id,
      name: institution.name,
      wallet: institution.wallet,
      tier: institution.tier,
      jurisdiction: institution.jurisdiction,
      members: institution.members.map((m) => ({
        wallet: m.wallet,
        role: m.role,
        label: m.label,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async getPortfolio(institutionId: string) {
    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      include: { members: true },
    });
    if (!institution) return null;

    const allWallets = [
      institution.wallet,
      ...institution.members.map((m) => m.wallet),
    ];

    const assets = await this.metaStore.getAll();
    const holdings: Array<{
      assetId: string;
      ticker: string;
      wallet: string;
      balance: number;
    }> = [];

    for (const asset of assets) {
      if (!asset.mintPubkey) continue;

      const mint = new PublicKey(asset.mintPubkey);

      for (const walletStr of allWallets) {
        try {
          const wallet = new PublicKey(walletStr);
          const tokenAccounts = await this.connection.getTokenAccountsByOwner(wallet, { mint });

          for (const { account } of tokenAccounts.value) {
            const amount = Number(account.data.readBigUInt64LE(64));
            if (amount > 0) {
              holdings.push({
                assetId: asset.assetId,
                ticker: asset.ticker,
                wallet: walletStr,
                balance: amount,
              });
            }
          }
        } catch {
          // RPC error or invalid wallet — skip
        }
      }
    }

    return { wallets: allWallets, holdings };
  }

  async getDocuments(institutionId: string) {
    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
    });
    if (!institution) return null;

    const assets = await this.metaStore.getAll();
    const documents: Array<{
      assetId: string;
      assetName: string;
      documents: Array<{ title: string; type: string; url: string; publishedAt?: string; hash?: string }>;
    }> = [];

    for (const asset of assets) {
      if (asset.documents.length > 0) {
        documents.push({
          assetId: asset.assetId,
          assetName: asset.name,
          documents: asset.documents,
        });
      }
    }

    return { documents };
  }

  async addMember(
    institutionId: string,
    wallet: string,
    role: string,
    label?: string
  ) {
    return prisma.institutionMember.create({
      data: {
        wallet,
        role,
        label: label ?? null,
        institutionId,
      },
    });
  }

  async removeMember(institutionId: string, wallet: string) {
    const member = await prisma.institutionMember.findUnique({
      where: { wallet },
    });
    if (!member || member.institutionId !== institutionId) return false;

    await prisma.institutionMember.delete({ where: { wallet } });
    return true;
  }
}
