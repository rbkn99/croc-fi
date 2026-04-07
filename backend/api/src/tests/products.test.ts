import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "@prooflayer/shared";

const { app } = createApp();

beforeAll(async () => {
  // Seed a test asset in DB
  await prisma.assetMeta.upsert({
    where: { id: "mtbill-sol" },
    update: {},
    create: {
      id: "mtbill-sol",
      name: "mTBILL",
      ticker: "mTBILL",
      assetType: "Treasury",
      description: "Test Treasury product",
      metadata: {
        legalStructure: { vehicleType: "SPV", entityName: "Test LLC", jurisdiction: "US", investorRestrictions: [] },
        underlying: { description: "US T-Bills" },
        counterparties: [{ role: "custodian", name: "Test Custodian" }],
        documents: [{ title: "Prospectus", type: "prospectus", url: "https://example.com/doc.pdf" }],
        fees: { managementFeeBps: 35, performanceFeeBps: 0, mintFeeBps: 10, redeemFeeBps: 10 },
        links: { website: "https://example.com" },
      },
      policyConfig: {
        requiredTier: "accredited",
        blockedJurisdictions: ["KP", "IR"],
      },
    },
  });
});

describe("GET /api/v1/products", () => {
  it("returns products list", async () => {
    const res = await request(app).get("/api/v1/products");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("products");
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products.length).toBeGreaterThan(0);
  });

  it("each product has required fields", async () => {
    const res = await request(app).get("/api/v1/products");
    const product = res.body.products[0];

    expect(product).toHaveProperty("id");
    expect(product).toHaveProperty("name");
    expect(product).toHaveProperty("ticker");
    expect(product).toHaveProperty("assetType");
    expect(product).toHaveProperty("price");
    expect(product).toHaveProperty("apy");
    expect(product).toHaveProperty("navBps");
    expect(product).toHaveProperty("mintFeeBps");
    expect(typeof product.price).toBe("number");
  });
});

describe("GET /api/v1/products/:id", () => {
  it("returns product detail with metadata", async () => {
    const res = await request(app).get("/api/v1/products/mtbill-sol");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("mtbill-sol");
    expect(res.body).toHaveProperty("legalStructure");
    expect(res.body).toHaveProperty("documents");
    expect(res.body).toHaveProperty("counterparties");
  });

  it("returns 404 for unknown product", async () => {
    const res = await request(app).get("/api/v1/products/nonexistent");
    expect(res.status).toBe(404);
  });
});
