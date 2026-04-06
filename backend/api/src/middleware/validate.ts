import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export function validateBody(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        details: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateParams(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: "Invalid parameters",
        details: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
      return;
    }
    next();
  };
}

// Common schemas
export const solanaPublicKeySchema = z.string().regex(
  /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  "Invalid Solana public key (base58)"
);

export const walletSchema = z.object({
  wallet: solanaPublicKeySchema,
});

export const assetWalletSchema = z.object({
  assetPubkey: solanaPublicKeySchema,
  wallet: solanaPublicKeySchema,
});

export const assetPubkeySchema = z.object({
  assetPubkey: solanaPublicKeySchema,
});
