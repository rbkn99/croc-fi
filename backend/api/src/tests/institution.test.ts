import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "@prooflayer/shared";
import { randomWalletToken } from "./helpers";

const { app } = createApp();

const INST_WALLET = "InstitutionAdmin111111111111111111111111111";
const MEMBER_WALLET = "InstitutionMember22222222222222222222222222";

beforeEach(async () => {
  await prisma.institutionMember.deleteMany();
  await prisma.institution.deleteMany();
});

describe("Institution Portal API", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/api/v1/institution/profile");
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-institution wallet", async () => {
    const token = randomWalletToken("RandomWallet1111111111111111111111111111111");
    const res = await request(app)
      .get("/api/v1/institution/profile")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  describe("with institution setup", () => {
    let token: string;

    beforeEach(async () => {
      await prisma.institution.create({
        data: {
          name: "Test Fund LP",
          wallet: INST_WALLET,
          tier: "institutional",
          jurisdiction: "US",
        },
      });
      token = randomWalletToken(INST_WALLET);
    });

    it("GET /profile returns institution profile", async () => {
      const res = await request(app)
        .get("/api/v1/institution/profile")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Test Fund LP");
      expect(res.body.wallet).toBe(INST_WALLET);
      expect(Array.isArray(res.body.members)).toBe(true);
    });

    it("GET /documents returns available documents", async () => {
      const res = await request(app)
        .get("/api/v1/institution/documents")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("documents");
      expect(Array.isArray(res.body.documents)).toBe(true);
    });

    it("POST /members adds a sub-wallet", async () => {
      const res = await request(app)
        .post("/api/v1/institution/members")
        .set("Authorization", `Bearer ${token}`)
        .send({ wallet: MEMBER_WALLET, role: "trader", label: "Desk A" });
      expect(res.status).toBe(200);
      expect(res.body.member.wallet).toBe(MEMBER_WALLET);
      expect(res.body.member.role).toBe("trader");

      // Verify in DB
      const member = await prisma.institutionMember.findUnique({ where: { wallet: MEMBER_WALLET } });
      expect(member).not.toBeNull();
    });

    it("POST /members rejects invalid role", async () => {
      const res = await request(app)
        .post("/api/v1/institution/members")
        .set("Authorization", `Bearer ${token}`)
        .send({ wallet: MEMBER_WALLET, role: "superadmin" });
      expect(res.status).toBe(400);
    });

    it("DELETE /members/:wallet removes a sub-wallet", async () => {
      // Add first
      await prisma.institutionMember.create({
        data: {
          wallet: MEMBER_WALLET,
          role: "viewer",
          institutionId: (await prisma.institution.findUnique({ where: { wallet: INST_WALLET } }))!.id,
        },
      });

      const res = await request(app)
        .delete(`/api/v1/institution/members/${MEMBER_WALLET}`)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);

      // Verify deleted
      const member = await prisma.institutionMember.findUnique({ where: { wallet: MEMBER_WALLET } });
      expect(member).toBeNull();
    });

    it("non-admin member cannot add members", async () => {
      const inst = await prisma.institution.findUnique({ where: { wallet: INST_WALLET } });
      await prisma.institutionMember.create({
        data: { wallet: MEMBER_WALLET, role: "viewer", institutionId: inst!.id },
      });

      const memberToken = randomWalletToken(MEMBER_WALLET);
      const res = await request(app)
        .post("/api/v1/institution/members")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ wallet: "NewWallet33333333333333333333333333333333333", role: "trader" });
      expect(res.status).toBe(403);
    });
  });
});
