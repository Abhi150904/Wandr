import { beforeEach, describe, expect, it, vi } from "vitest";

import { plannerAgent } from "./planner.agent.js";
import { invokeGeminiText } from "../config/llm.js";
import type { AgentState } from "../graph/state.js";
import { searchWeb } from "../tools/web-search.tool.js";

vi.mock("../config/llm.js", () => ({
  invokeGeminiText: vi.fn()
}));

vi.mock("../tools/web-search.tool.js", () => ({
  searchWeb: vi.fn()
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

describe("planner agent", () => {
  beforeEach(() => {
    mockedSearchWeb.mockResolvedValue([]);
  });

  it("returns an itinerary-shaped fallback when Gemini is unavailable", async () => {
    mockedInvokeGeminiText.mockRejectedValueOnce(new Error("model unavailable"));

    const result = await plannerAgent(createState("Plan a weekend trip to Jaipur"));

    expect(result.generatedOutput).toContain("Weekend plan for Jaipur");
    expect(result.generatedOutput).toContain("Day 1 morning");
    expect(result.generatedOutput).toContain("Day 2 afternoon");
    expect(result.generatedOutput).not.toContain("Execute the first graph step");
    expect(result.generatedOutput).not.toContain("Pick the main destination");
  });

  it("uses the requested destination in the fallback instead of a hardcoded city list", async () => {
    mockedInvokeGeminiText.mockRejectedValueOnce(new Error("model unavailable"));

    const result = await plannerAgent(createState("Plan a weekend trip to Mussoorie"));

    expect(result.generatedOutput).toContain("Weekend plan for Mussoorie");
    expect(result.generatedOutput).toContain("Day 1 evening");
    expect(result.generatedOutput).toContain("Day 2 morning");
    expect(result.generatedOutput).not.toContain("Pick the main destination");
  });

  it("keeps web search sources out of planner fallback prose when Gemini is unavailable", async () => {
    mockedSearchWeb.mockResolvedValueOnce([
      {
        title: "Mussoorie weekend guide",
        url: "https://example.com/mussoorie-weekend",
        snippet: "Mall Road, Landour, Lal Tibba, and Kempty Falls are common weekend stops."
      }
    ]);
    mockedInvokeGeminiText.mockRejectedValueOnce(new Error("model unavailable"));

    const result = await plannerAgent(createState("Plan a weekend trip to Mussoorie from Delhi"));

    expect(result.generatedOutput).toContain("Weekend plan for Mussoorie");
    expect(result.generatedOutput).toContain("Use the sources below");
    expect(result.generatedOutput).not.toContain("Mussoorie weekend guide");
    expect(result.generatedOutput).not.toContain("Mall Road, Landour");
    expect(result.sources).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });

  it("extracts the destination from a route and start-time request", async () => {
    mockedInvokeGeminiText.mockRejectedValueOnce(new Error("quota exceeded"));

    const result = await plannerAgent(
      createState("Plan a weekend trip to Jaipur from Delhi, Start from Friday Morning")
    );

    expect(result.generatedOutput).toContain("Weekend plan for Jaipur");
    expect(result.generatedOutput).not.toContain("Weekend plan for Plan a weekend trip");
  });
});
