import { createHmac, timingSafeEqual } from "crypto";
import {
  KycStatus,
  InvestorTier,
  KycRecord,
  KycWebhookPayload,
  KycProviderConfig,
} from "@prooflayer/shared";

export interface KycVerificationResult {
  status: KycStatus;
  tier: InvestorTier;
  jurisdiction: string;
  rejectionReason: string | null;
}

export interface KycProvider {
  verifyWebhookSignature(body: string, signature: string): boolean;
  parseWebhook(payload: KycWebhookPayload): KycVerificationResult;
  createApplicant(wallet: string, externalId: string): Promise<string>;
  getVerificationUrl(applicantId: string): Promise<string>;
}

export class SumsubProvider implements KycProvider {
  constructor(private config: KycProviderConfig) {}

  verifyWebhookSignature(body: string, signature: string): boolean {
    const hmac = createHmac("sha256", this.config.webhookSecret);
    hmac.update(body);
    const expected = hmac.digest("hex");
    const expectedBuf = Buffer.from(expected, "utf-8");
    const signatureBuf = Buffer.from(signature, "utf-8");
    if (expectedBuf.length !== signatureBuf.length) return false;
    return timingSafeEqual(expectedBuf, signatureBuf);
  }

  parseWebhook(payload: KycWebhookPayload): KycVerificationResult {
    const answer = payload.reviewResult?.reviewAnswer;

    if (payload.reviewStatus === "completed" && answer === "GREEN") {
      return {
        status: KycStatus.Approved,
        tier: InvestorTier.Accredited,
        jurisdiction: "US",
        rejectionReason: null,
      };
    }

    if (answer === "RED") {
      return {
        status: KycStatus.Rejected,
        tier: InvestorTier.Retail,
        jurisdiction: "unknown",
        rejectionReason: payload.reviewResult?.rejectLabels?.join(", ") ?? "Review rejected",
      };
    }

    return {
      status: KycStatus.Pending,
      tier: InvestorTier.Retail,
      jurisdiction: "unknown",
      rejectionReason: null,
    };
  }

  async createApplicant(wallet: string, _externalId: string): Promise<string> {
    // TODO: POST to Sumsub API /resources/applicants
    // For now, return mock applicant ID
    return `sumsub_${wallet.slice(0, 8)}_${Date.now()}`;
  }

  async getVerificationUrl(applicantId: string): Promise<string> {
    // TODO: generate Sumsub WebSDK access token
    return `https://api.sumsub.com/idensic/l/#/sbx_${applicantId}`;
  }
}

export class ManualProvider implements KycProvider {
  verifyWebhookSignature(_body: string, _signature: string): boolean {
    return true;
  }

  parseWebhook(_payload: KycWebhookPayload): KycVerificationResult {
    return {
      status: KycStatus.Approved,
      tier: InvestorTier.Accredited,
      jurisdiction: "US",
      rejectionReason: null,
    };
  }

  async createApplicant(wallet: string, _externalId: string): Promise<string> {
    return `manual_${wallet.slice(0, 8)}_${Date.now()}`;
  }

  async getVerificationUrl(_applicantId: string): Promise<string> {
    return "https://prooflayer.io/kyc/manual";
  }
}

export function createKycProvider(config: KycProviderConfig): KycProvider {
  switch (config.provider) {
    case "sumsub":
      return new SumsubProvider(config);
    case "manual":
    default:
      return new ManualProvider();
  }
}
