import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { randomWalletToken } from "./helpers";

const { app } = createApp();

describe("POST /api/v1/auth/challenge", () => {
  it("returns 400 if wallet is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/challenge")
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns nonce and message for valid wallet", async () => {
    const res = await request(app)
      .post("/api/v1/auth/challenge")
      .send({ wallet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("nonce");
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toContain("Sign this message");
    expect(res.body.message).toContain(res.body.nonce);
  });
});

describe("POST /api/v1/auth/verify", () => {
  it("returns 400 if fields are missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/verify")
      .send({ wallet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" });
    expect(res.status).toBe(400);
  });

  it("returns 401 with invalid signature", async () => {
    // First get a challenge
    const challengeRes = await request(app)
      .post("/api/v1/auth/challenge")
      .send({ wallet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" });

    const res = await request(app)
      .post("/api/v1/auth/verify")
      .send({
        wallet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
        signature: "invalidbase64signature",
        nonce: challengeRes.body.nonce,
      });
    expect(res.status).toBe(401);
  });
});

describe("Protected routes", () => {
  it("issuer endpoints return 401 without auth", async () => {
    const res = await request(app).get("/api/v1/issuer/kyc-summary");
    expect(res.status).toBe(401);
  });

  it("issuer endpoints return 403 with non-issuer wallet", async () => {
    const token = randomWalletToken("SomeRandomWallet11111111111111111111111111");
    const res = await request(app)
      .get("/api/v1/issuer/kyc-summary")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
