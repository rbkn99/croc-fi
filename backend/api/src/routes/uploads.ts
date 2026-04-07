import { Router, Request, Response } from "express";
import multer from "multer";
import { createHash } from "crypto";
import { saveFile } from "../services/storage";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "/data/uploads";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/svg+xml",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

/**
 * POST /api/v1/uploads/documents
 * Saves uploaded file to Railway Volume.
 */
export function createUploadsRouter(): Router {
  const router = Router();

  router.post("/documents", upload.single("file"), async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded or file type not allowed (PDF, PNG, JPG, DOC, DOCX)" });
      return;
    }

    try {
      const hash = createHash("sha256").update(file.buffer).digest("hex");
      const ts = Date.now();
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `documents/${ts}-${safe}`;

      const url = await saveFile(key, file.buffer, file.mimetype);

      res.json({
        url,
        filename: `${ts}-${safe}`,
        originalName: file.originalname,
        hash,
        size: file.size,
        mimetype: file.mimetype,
      });
    } catch (err) {
      console.error("[Upload] save failed:", err);
      res.status(500).json({ error: "File upload failed" });
    }
  });

  return router;
}

/**
 * GET /api/v1/files/:subdir/:filename
 * Serves files from Railway Volume.
 */
export function createFilesRouter(): Router {
  const router = Router();

  router.get("/:subdir/:filename", (req: Request, res: Response) => {
    const safeSub = path.basename(String(req.params.subdir));
    const safeFile = path.basename(String(req.params.filename));
    const fullPath = path.join(UPLOAD_DIR, safeSub, safeFile);

    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    // Allow any origin to load static files (images, PDFs)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.sendFile(fullPath);
  });

  return router;
}
