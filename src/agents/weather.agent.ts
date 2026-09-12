import { AIMessage } from "@langchain/core/messages";

import { invokeGeminiText } from "../config/llm.js";
import type { AgentState, AgentStateUpdate } from "../graph/state.js";

const fallbackWeatherGuidance = (userQuery: string): string =>
  [
    `Weather guidance for: ${userQuery}`,
    "1. Treat this as non-live weather guidance until MCP weather tools are added.",
    "2. Identify the destination, season, and travel dates if the user supplied them.",
    "3. Suggest weather-aware planning considerations such as layers, rain plans, and forecast checks.",
    "4. Recommend verifying live conditions before booking or departure."
  ].join("\n");

export const weatherAgent = async (state: AgentState): Promise<AgentStateUpdate> => {
  try {
    const generatedOutput =
      (await invokeGeminiText(
        "You are a weather-aware travel planning agent. Provide general weather planning guidance only; do not invent live forecast data.",
        state.userQuery
      )) ?? fallbackWeatherGuidance(state.userQuery);

    return {
      generatedOutput,
      weatherOutput: generatedOutput,
      messages: [new AIMessage(generatedOutput)]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown weather agent error";
    const generatedOutput = fallbackWeatherGuidance(state.userQuery);

    return {
      error: message,
      generatedOutput,
      weatherOutput: generatedOutput,
      messages: [new AIMessage(`Weather fallback used after error: ${message}`)]
    };
  }
};
