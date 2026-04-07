/**
 * File storage — writes to Railway Volume (or local disk).
 * Mount a Railway Volume at /data/uploads in the Railway service settings.
 * Falls back to ./uploads locally.
 */
import fs from "fs";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "/data/uploads";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function isStorageConfigured(): boolean {
  return true; // always available — just needs disk
}

export async function saveFile(
  key: string,
  body: Buffer,
  _contentType: string
): Promise<string> {
  const fullPath = path.join(UPLOAD_DIR, key);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, body);

  const baseUrl = process.env.BACKEND_URL ?? "";
  return `${baseUrl}/api/v1/files/${key}`;
}
