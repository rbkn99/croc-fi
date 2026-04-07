import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "@prooflayer/shared";

const { app } = createApp();

beforeEach(async () => {
  // Clean KYC records between tests
  await prisma.auditEntry.deleteMany();
  await prisma.whitelistSync.deleteMany();
  await prisma.kycRecord.deleteMany();
});

describe("POST /api/v1/kyc/start", () => {
  it("returns 400 if wallet is missing", async () => {
    const res = await request(app)
      .post("/api/v1/kyc/start")
      .send({});
    expect(res.status).toBe(400);
  });

  it("creates a pending KYC record for new wallet", async () => {
    const wallet = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
    const res = await request(app)
      .post("/api/v1/kyc/start")
      .send({ wallet });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("pending");
    expect(res.body).toHaveProperty("applicantId");
    expect(res.body).toHaveProperty("verificationUrl");

    // Verify DB record was created
    const record = await prisma.kycRecord.findUnique({ where: { wallet } });
    expect(record).not.toBeNull();
    expect(record!.status).toBe("pending");
  });

  it("returns already_approved if wallet is already approved", async () => {
    const wallet = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

    // Seed an approved record
    await prisma.kycRecord.create({
      data: {
        wallet,
        provider: "manual",
        status: "approved",
        tier: "accredited",
        jurisdiction: "US",
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 86400 * 1000),
      },
    });

    const res = await request(app)
      .post("/api/v1/kyc/start")
      .send({ wallet });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("already_approved");
  });
});

describe("GET /api/v1/kyc/status/:wallet", () => {
  it("returns not_started for unknown wallet", async () => {
    const res = await request(app).get(
      "/api/v1/kyc/status/9WgvmKGLDHiEajUk7Cxzmb69rpEF6PuoBHtSqgCtuPor"
    );
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("not_started");
  });

  it("returns approved status for approved wallet", async () => {
    const wallet = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
    await prisma.kycRecord.create({
      data: {
        wallet,
        provider: "manual",
        status: "approved",
        tier: "accredited",
        jurisdiction: "US",
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 86400 * 1000),
      },
    });

    const res = await request(app).get(`/api/v1/kyc/status/${wallet}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("approved");
    expect(res.body.tier).toBe("accredited");
    expect(res.body.isExpired).toBe(false);
  });

  it("returns expired for wallet with past expiresAt", async () => {
    const wallet = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
    await prisma.kycRecord.create({
      data: {
        wallet,
        provider: "manual",
        status: "approved",
        tier: "accredited",
        expiresAt: new Date(Date.now() - 86400 * 1000), // expired yesterday
      },
    });

    const res = await request(app).get(`/api/v1/kyc/status/${wallet}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("expired");
    expect(res.body.isExpired).toBe(true);
  });
});

describe("GET /api/v1/kyc/list", () => {
  it("returns all KYC records", async () => {
    await prisma.kycRecord.createMany({
      data: [
        { wallet: "wallet1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", provider: "manual", status: "approved" },
        { wallet: "wallet2bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", provider: "manual", status: "pending" },
      ],
    });

    const res = await request(app).get("/api/v1/kyc/list");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.records).toHaveLength(2);
  });
});

describe("POST /api/v1/kyc/webhook (manual provider)", () => {
  it("processes webhook and updates KYC record", async () => {
    const wallet = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

    const res = await request(app)
      .post("/api/v1/kyc/webhook")
      .send({
        externalUserId: wallet,
        reviewStatus: "completed",
        reviewResult: { reviewAnswer: "GREEN" },
        applicantId: "test-applicant-123",
        type: "applicantReviewed",
        createdAt: new Date().toISOString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.kycStatus).toBe("approved");

    // Verify DB
    const record = await prisma.kycRecord.findUnique({ where: { wallet } });
    expect(record).not.toBeNull();
    expect(record!.status).toBe("approved");
    expect(record!.tier).toBe("accredited");
  });

  it("returns 400 if externalUserId is missing", async () => {
    const res = await request(app)
      .post("/api/v1/kyc/webhook")
      .send({
        reviewStatus: "completed",
        applicantId: "test",
        type: "test",
        createdAt: new Date().toISOString(),
      });

    expect(res.status).toBe(400);
  });
});
