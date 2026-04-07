import { Router, Request, Response } from "express";
import { prisma } from "@prooflayer/shared";
import { logAudit } from "../services/audit-logger";

export function createActivityRouter(): Router {
  const router = Router();

  // POST /api/v1/activity — log a client-side event (e.g. mint/redeem tx)
  router.post("/", async (req: Request, res: Response) => {
    const { action, actor, target, txSignature, details } = req.body as {
      action?: string;
      actor?: string;
      target?: string;
      txSignature?: string;
      details?: Record<string, unknown>;
    };
    if (!action || !actor) {
      res.status(400).json({ error: "action and actor are required" });
      return;
    }
    await logAudit(action, actor, target, details, txSignature);
    res.json({ ok: true });
  });

  // GET /api/v1/activity?limit=20&offset=0
  router.get("/", async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(String(req.query.limit ?? "20"), 10), 100);
    const offset = Math.max(parseInt(String(req.query.offset ?? "0"), 10), 0);

    const [entries, total] = await Promise.all([
      prisma.auditEntry.findMany({
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          action: true,
          actor: true,
          target: true,
          details: true,
          txSignature: true,
          timestamp: true,
        },
      }),
      prisma.auditEntry.count(),
    ]);

    res.json({
      activity: entries.map((e) => ({
        ...e,
        timestamp: e.timestamp.getTime(),
      })),
      total,
      hasMore: offset + limit < total,
    });
  });

  return router;
}
