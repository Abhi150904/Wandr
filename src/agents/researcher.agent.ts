import { AIMessage } from "@langchain/core/messages";

import { invokeGeminiText } from "../config/llm.js";
import type { AgentState, AgentStateUpdate } from "../graph/state.js";

const fallbackResearch = (userQuery: string): string =>
  [
    `Research brief for: ${userQuery}`,
    "1. Identify the core facts needed to answer the request.",
    "2. Separate known information from assumptions.",
    "3. Flag anything that requires live search or an external data source in a future phase.",
    "4. Return a concise synthesis that can feed a planner or supervisor."
  ].join("\n");

export const researcherAgent = async (state: AgentState): Promise<AgentStateUpdate> => {
  try {
    const generatedOutput =
      (await invokeGeminiText(
        "You are a careful research agent. Provide a concise research brief. Do not claim live web access.",
        state.userQuery
      )) ?? fallbackResearch(state.userQuery);

    return {
      generatedOutput,
      researcherOutput: generatedOutput,
      messages: [new AIMessage(generatedOutput)]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown researcher error";
    const generatedOutput = fallbackResearch(state.userQuery);

    return {
      error: message,
      generatedOutput,
      researcherOutput: generatedOutput,
      messages: [new AIMessage(`Researcher fallback used after error: ${message}`)]
    };
  }
};
