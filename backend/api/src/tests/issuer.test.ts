import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "@prooflayer/shared/src/db";
import { issuerToken } from "./helpers";

const { app } = createApp();

beforeEach(async () => {
  await prisma.auditEntry.deleteMany();
  await prisma.whitelistSync.deleteMany();
  await prisma.kycRecord.deleteMany();
});

describe("GET /api/v1/issuer/kyc-summary", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/v1/issuer/kyc-summary");
    expect(res.status).toBe(401);
  });

  it("returns zeros when no records exist (with auth)", async () => {
    const res = await request(app)
      .get("/api/v1/issuer/kyc-summary")
      .set("Authorization", `Bearer ${issuerToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      expired: 0,
      expiringIn7d: 0,
    });
  });

  it("returns correct counts with mixed records", async () => {
    await prisma.kycRecord.createMany({
      data: [
        { wallet: "walletApproved111111111111111111111111111111111", provider: "manual", status: "approved" },
        { wallet: "walletPending2222222222222222222222222222222222", provider: "manual", status: "pending" },
        { wallet: "walletRejected33333333333333333333333333333333", provider: "manual", status: "rejected" },
        { wallet: "walletExpired444444444444444444444444444444444", provider: "manual", status: "expired" },
      ],
    });

    const res = await request(app)
      .get("/api/v1/issuer/kyc-summary")
      .set("Authorization", `Bearer ${issuerToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(4);
    expect(res.body.approved).toBe(1);
    expect(res.body.pending).toBe(1);
    expect(res.body.rejected).toBe(1);
    expect(res.body.expired).toBe(1);
  });
});

describe("GET /api/v1/assets/meta/list", () => {
  it("returns asset metadata list (public, no auth needed)", async () => {
    const res = await request(app).get("/api/v1/assets/meta/list");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("assets");
    expect(Array.isArray(res.body.assets)).toBe(true);
  });
});
