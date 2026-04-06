import { Router, Request, Response } from "express";
import multer from "multer";
import { createHash } from "crypto";
import { readFileSync, mkdirSync } from "fs";
import path from "path";

export const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

// Ensure uploads dir exists
mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${ts}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    cb(null, allowed.includes(file.mimetype));
  },
});

export function createUploadsRouter(baseUrl: string): Router {
  const router = Router();

  /**
   * POST /api/v1/uploads/documents
   * Accepts a single file (field name: "file").
   * Returns { url, filename, hash, size, mimetype }.
   */
  router.post("/documents", upload.single("file"), (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded or file type not allowed (PDF, PNG, JPG, DOC, DOCX)" });
      return;
    }

    const buf = readFileSync(file.path);
    const hash = createHash("sha256").update(buf).digest("hex");

    res.json({
      url: `${baseUrl}/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      hash,
      size: file.size,
      mimetype: file.mimetype,
    });
  });

  return router;
}
