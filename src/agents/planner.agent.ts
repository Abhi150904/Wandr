import { AIMessage } from "@langchain/core/messages";

import { invokeGeminiText } from "../config/llm.js";
import type { AgentState, AgentStateUpdate } from "../graph/state.js";

const fallbackPlan = (userQuery: string): string => {
  const topic = userQuery.trim() || "the user's request";

  return [
    `Plan for: ${topic}`,
    "1. Clarify the task objective and desired output.",
    "2. Identify the smallest useful agent workflow.",
    "3. Execute the first graph step and capture the result.",
    "4. Defer MCP, routing, guardrails, persistence, API, and UI work to later phases."
  ].join("\n");
};

export const plannerAgent = async (state: AgentState): Promise<AgentStateUpdate> => {
  try {
    const generatedOutput =
      (await invokeGeminiText(
        "You are a concise planning agent. Produce a short, practical plan for the user's request.",
        state.userQuery
      )) ?? fallbackPlan(state.userQuery);

    return {
      generatedOutput,
      plannerOutput: generatedOutput,
      messages: [new AIMessage(generatedOutput)]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown planner error";
    const generatedOutput = fallbackPlan(state.userQuery);

    return {
      error: message,
      generatedOutput,
      plannerOutput: generatedOutput,
      messages: [new AIMessage(`Planner fallback used after error: ${message}`)]
    };
  }
};
