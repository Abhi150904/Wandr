import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "./app.js";
import { resumeRun, startRun } from "../graph/runner.js";

vi.mock("../graph/runner.js", () => ({
  startRun: vi.fn(),
  resumeRun: vi.fn()
}));

const mockedStartRun = vi.mocked(startRun);
const mockedResumeRun = vi.mocked(resumeRun);

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
  });

  it("resumes a run", async () => {
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
  });
});
