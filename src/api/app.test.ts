import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "./app.js";
import { resumeRun, startRun } from "../graph/runner.js";
import { getRunHistory, saveRunHistory } from "./run-history.js";

vi.mock("../graph/runner.js", () => ({
  startRun: vi.fn(),
  resumeRun: vi.fn()
}));

vi.mock("./run-history.js", () => ({
  getRunHistory: vi.fn(),
  listRunHistory: vi.fn().mockResolvedValue([]),
  saveRunHistory: vi.fn()
}));

const mockedStartRun = vi.mocked(startRun);
const mockedResumeRun = vi.mocked(resumeRun);
const mockedGetRunHistory = vi.mocked(getRunHistory);
const mockedSaveRunHistory = vi.mocked(saveRunHistory);

describe("api app", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns health details", async () => {
    const response = await request(createApp()).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.features).toContain("hitl_resume");
  });

  it("returns readiness details without exposing secret values", async () => {
    const response = await request(createApp()).get("/ready");

    expect([200, 503]).toContain(response.status);
    expect(response.body.dependencies).toEqual(
      expect.objectContaining({
        database: expect.any(String),
        clerk: expect.any(String),
        gemini: expect.any(String),
        tavily: expect.any(String),
        openWeather: expect.any(String),
        webOrigin: expect.any(String)
      })
    );
    expect(JSON.stringify(response.body)).not.toContain("sk_");
    expect(JSON.stringify(response.body)).not.toContain("pk_");
  });

  it("allows the local web origin for browser API calls", async () => {
    const response = await request(createApp())
      .get("/health")
      .set("Origin", "http://localhost:3001");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3001");
  });

  it("rejects unconfigured browser origins", async () => {
    const response = await request(createApp())
      .get("/health")
      .set("Origin", "https://example.invalid");

    expect(response.status).toBe(500);
    expect(response.body.error.message).toContain("CORS origin not allowed");
  });

  it("validates start run body", async () => {
    const response = await request(createApp()).post("/api/runs").send({ message: "" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe("Validation failed.");
  });

  it("starts a run", async () => {
    mockedStartRun.mockResolvedValue({
      success: true,
      status: "requires_approval",
      threadId: "api-test",
      checkpointer: "postgres",
      approval: {
        question: "Approve?",
        draftOutput: "Draft",
        approvalRequest: "Review it",
        supervisorReasoning: "Planning",
        sources: [],
        expectedResponse: {
          approved: true
        }
      }
    });

    const response = await request(createApp())
      .post("/api/runs")
      .send({ message: "Plan a trip", threadId: "api-test" });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("requires_approval");
    expect(mockedStartRun).toHaveBeenCalledWith("Plan a trip", "api-test");
    expect(mockedSaveRunHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Plan a trip",
        mode: "research",
        threadId: "api-test",
        userId: "local-dev-user"
      })
    );
  });

  it("resumes a run", async () => {
    mockedGetRunHistory.mockResolvedValue({
      threadId: "api-test",
      userId: "local-dev-user",
      message: "Plan a trip",
      mode: "plan",
      status: "requires_approval",
      draftOutput: "Draft",
      generatedOutput: "Draft",
      finalOutput: "",
      sources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    mockedResumeRun.mockResolvedValue({
      success: true,
      status: "completed",
      threadId: "api-test",
      checkpointer: "postgres",
      result: {
        guardrailAllowed: true,
        guardrailReason: "Allowed",
        supervisorReasoning: "Planning",
        approved: true,
        generatedOutput: "Final",
        finalOutput: "Final",
        sources: []
      }
    });

    const response = await request(createApp())
      .post("/api/runs/api-test/resume")
      .send({ approved: true });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("completed");
    expect(mockedResumeRun).toHaveBeenCalledWith("api-test", { approved: true });
    expect(mockedSaveRunHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Plan a trip",
        mode: "plan",
        status: "completed",
        threadId: "api-test",
        userId: "local-dev-user"
      })
    );
  });
});
