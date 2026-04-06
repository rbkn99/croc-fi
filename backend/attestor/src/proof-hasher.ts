import { createHash } from "crypto";

export interface ProofDocument {
  custodianName: string;
  documentUrl: string;
  documentHash: string;
  timestamp: number;
}

export function hashProofDocument(document: ProofDocument): Buffer {
  const payload = JSON.stringify({
    custodian: document.custodianName,
    url: document.documentUrl,
    hash: document.documentHash,
    ts: document.timestamp,
  });

  return createHash("sha256").update(payload).digest();
}
