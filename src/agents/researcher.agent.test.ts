import { describe, expect, it, vi } from "vitest";

import { researcherAgent } from "./researcher.agent.js";
import { invokeGeminiText } from "../config/llm.js";
import type { AgentState } from "../graph/state.js";

vi.mock("../config/llm.js", () => ({
  invokeGeminiText: vi.fn()
}));

const mockedInvokeGeminiText = vi.mocked(invokeGeminiText);

const createState = (userQuery: string): AgentState =>
  ({
    messages: [],
    userQuery,
    generatedOutput: "",
    selectedAgent: undefined,
    guardrailAllowed: true,
    guardrailReason: "",
    supervisorReasoning: "",
    plannerOutput: "",
    researcherOutput: "",
    weatherOutput: "",
    draftOutput: "",
    approvalRequest: "",
    requiresApproval: false,
    humanFeedback: "",
    finalOutput: "",
    approved: undefined,
    error: undefined
  }) as AgentState;

describe("researcher agent", () => {
  it("returns useful deterministic travel guidance when Gemini is unavailable", async () => {
    mockedInvokeGeminiText.mockRejectedValueOnce(new Error("model unavailable"));

    const result = await researcherAgent(createState("Find the best time to visit Japan"));

    expect(result.generatedOutput).toContain("Best time to visit Japan");
    expect(result.generatedOutput).toContain("Spring");
    expect(result.generatedOutput).toContain("Autumn");
  });
});
