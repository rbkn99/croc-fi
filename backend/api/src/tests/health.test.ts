import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app";

const { app } = createApp();

describe("GET /api/v1/health", () => {
  it("returns ok status with cluster and kycProvider", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body).toHaveProperty("cluster");
    expect(res.body).toHaveProperty("kycProvider");
  });
});
