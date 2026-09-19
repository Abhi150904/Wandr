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
        finalOutput: "Final"
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
