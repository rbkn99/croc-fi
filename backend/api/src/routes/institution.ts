import { Router, Request, Response } from "express";
import { InstitutionService } from "../services/institution-service";
import { logAudit } from "../services/audit-logger";

export function createInstitutionRouter(
  institutionService: InstitutionService
): Router {
  const router = Router();

  router.get("/profile", async (req: Request, res: Response) => {
    const profile = await institutionService.getProfile(req.institutionId!);

    if (!profile) {
      res.status(404).json({ error: "Institution not found" });
      return;
    }

    res.json(profile);
  });

  router.get("/portfolio", async (req: Request, res: Response) => {
    try {
      const portfolio = await institutionService.getPortfolio(req.institutionId!);
      if (!portfolio) {
        res.status(404).json({ error: "Institution not found" });
        return;
      }
      res.json(portfolio);
    } catch (err) {
      console.error("[Institution] Portfolio error:", err);
      res.status(500).json({ error: "Failed to fetch portfolio" });
    }
  });

  router.get("/documents", async (req: Request, res: Response) => {
    const docs = await institutionService.getDocuments(req.institutionId!);
    if (!docs) {
      res.status(404).json({ error: "Institution not found" });
      return;
    }
    res.json(docs);
  });

  router.post("/members", async (req: Request, res: Response) => {
    if (req.institutionRole !== "admin") {
      res.status(403).json({ error: "Only admin can manage members" });
      return;
    }

    const { wallet, role, label } = req.body;
    if (!wallet || !role) {
      res.status(400).json({ error: "wallet and role are required" });
      return;
    }

    if (!["admin", "trader", "viewer"].includes(role)) {
      res.status(400).json({ error: "role must be admin, trader, or viewer" });
      return;
    }

    try {
      const member = await institutionService.addMember(req.institutionId!, wallet, role, label);
      await logAudit("institution.member_added", req.wallet ?? "unknown", wallet, { role, label, institutionId: req.institutionId });
      res.json({ status: "ok", member: { wallet: member.wallet, role: member.role, label: member.label } });
    } catch (err) {
      console.error("[Institution] Add member error:", err);
      res.status(400).json({ error: "Failed to add member (wallet may already exist)" });
    }
  });

  router.delete("/members/:wallet", async (req: Request, res: Response) => {
    if (req.institutionRole !== "admin") {
      res.status(403).json({ error: "Only admin can manage members" });
      return;
    }

    const wallet = String(req.params.wallet);
    const removed = await institutionService.removeMember(req.institutionId!, wallet);

    if (!removed) {
      res.status(404).json({ error: "Member not found in this institution" });
      return;
    }

    await logAudit("institution.member_removed", req.wallet ?? "unknown", wallet, { institutionId: req.institutionId });
    res.json({ status: "ok" });
  });

  return router;
}
