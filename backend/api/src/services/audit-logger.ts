import { prisma } from "@prooflayer/shared";
import type { Prisma } from "@prisma/client";

export async function logAudit(
  action: string,
  actor: string,
  target?: string,
  details?: Record<string, unknown>,
  txSignature?: string
): Promise<void> {
  try {
    await prisma.auditEntry.create({
      data: {
        action,
        actor,
        target: target ?? null,
        details: details ? (details as Prisma.InputJsonValue) : undefined,
        txSignature: txSignature ?? null,
        kycWallet: action.startsWith("kyc.") ? (target ?? null) : null,
      },
    });
  } catch (err) {
    console.error("[Audit] Failed to log:", action, err);
  }
}
