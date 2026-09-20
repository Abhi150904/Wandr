import { describe, expect, it, vi } from "vitest";

import { researcherAgent } from "./researcher.agent.js";
import { invokeGeminiText } from "../config/llm.js";
import { searchWeb } from "../tools/web-search.tool.js";
import type { AgentState } from "../graph/state.js";

vi.mock("../config/llm.js", () => ({
  invokeGeminiText: vi.fn()
}));

vi.mock("../tools/web-search.tool.js", () => ({
  searchWeb: vi.fn().mockResolvedValue([
    {
      title: "Japan travel seasons",
      url: "https://example.com/japan-seasons",
      snippet: "Spring and autumn are common Japan travel recommendations."
    }
  ])
}));

const mockedInvokeGeminiText = vi.mocked(invokeGeminiText);
const mockedSearchWeb = vi.mocked(searchWeb);

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
    sources: [],
    approved: undefined,
    error: undefined
  }) as AgentState;

describe("researcher agent", () => {
  it("uses Tavily snippets when Gemini fails for a comparison query", async () => {
    mockedInvokeGeminiText.mockRejectedValueOnce(new Error("model unavailable"));
    mockedSearchWeb.mockResolvedValueOnce([
      {
        title: "Udaipur vs Jaipur - Best Travel City of India",
        url: "https://example.com/jaipur-udaipur",
        snippet: "Compare attractions, experiences, costs, and travel tips to plan your perfect trip."
      }
    ]);

    const result = await researcherAgent(createState("Compare Jaipur and Udaipur for a weekend trip"));

    expect(result.generatedOutput).toContain("Udaipur vs Jaipur");
    expect(result.generatedOutput).toContain("Compare attractions");
    expect(result.generatedOutput).not.toContain("Define the destination");
    expect(result.error).toBeUndefined();
  });

  it("returns useful deterministic travel guidance when Gemini is unavailable", async () => {
    mockedInvokeGeminiText.mockRejectedValueOnce(new Error("model unavailable"));

    const result = await researcherAgent(createState("Find the best time to visit Japan"));

    expect(result.generatedOutput).toContain("Research brief for: Find the best time to visit Japan");
    expect(result.generatedOutput).toContain("Japan travel seasons");
    expect(result.generatedOutput).toContain("Spring");
    expect(result.generatedOutput).toContain("autumn");
    expect(result.sources).toHaveLength(1);
    expect(mockedSearchWeb).toHaveBeenCalledWith("Find the best time to visit Japan");
  });
});
