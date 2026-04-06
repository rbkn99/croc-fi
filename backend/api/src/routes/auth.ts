import { Router, Request, Response } from "express";
import { generateChallenge, verifyAndIssueToken } from "../middleware/auth";

export function createAuthRouter(): Router {
  const router = Router();

  router.post("/challenge", (req: Request, res: Response) => {
    const { wallet } = req.body;
    if (!wallet || typeof wallet !== "string") {
      res.status(400).json({ error: "wallet is required" });
      return;
    }

    const nonce = generateChallenge(wallet);
    const message = `Sign this message to authenticate with ProofLayer:\n${nonce}`;

    res.json({ nonce, message });
  });

  router.post("/verify", (req: Request, res: Response) => {
    const { wallet, signature, nonce } = req.body;
    if (!wallet || !signature || !nonce) {
      res.status(400).json({ error: "wallet, signature, and nonce are required" });
      return;
    }

    const token = verifyAndIssueToken(wallet, signature, nonce);
    if (!token) {
      res.status(401).json({ error: "Invalid signature or expired nonce" });
      return;
    }

    res.json({ token });
  });

  return router;
}
