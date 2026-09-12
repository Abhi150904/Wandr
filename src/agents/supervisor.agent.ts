import { AIMessage } from "@langchain/core/messages";
import { z } from "zod";

import { invokeGeminiText } from "../config/llm.js";
import type { AgentState, AgentStateUpdate } from "../graph/state.js";
import { AGENT_NAMES, type AgentName, type SupervisorDecision } from "../graph/types.js";

const supervisorDecisionSchema = z.object({
  selectedAgent: z.enum(AGENT_NAMES),
  reason: z.string().trim().min(1)
});

const parseSupervisorDecision = (text: string): SupervisorDecision => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Supervisor response did not contain a JSON object.");
  }

  return supervisorDecisionSchema.parse(JSON.parse(text.slice(start, end + 1)));
};

const fallbackDecision = (userQuery: string): SupervisorDecision => {
  const query = userQuery.toLowerCase();

  const weatherTerms = ["weather", "forecast", "rain", "temperature", "climate", "pack"];
  const researchTerms = ["research", "compare", "find", "explain", "summarize", "information"];

  if (weatherTerms.some((term) => query.includes(term))) {
    return {
      selectedAgent: "weather",
      reason: "The request appears to need weather or packing guidance."
    };
  }

  if (researchTerms.some((term) => query.includes(term))) {
    return {
      selectedAgent: "researcher",
      reason: "The request appears to need a concise research brief."
    };
  }

  return {
    selectedAgent: "planner",
    reason: "The request is best handled as a planning task."
  };
};

export const supervisorAgent = async (state: AgentState): Promise<AgentStateUpdate> => {
  let decision: SupervisorDecision;

  try {
    const response = await invokeGeminiText(
      [
        "You are a supervisor for a small LangGraph agent system.",
        "Choose exactly one next agent: planner, researcher, or weather.",
        "Return strict JSON only with this schema:",
        '{"selectedAgent":"planner | researcher | weather","reason":"short reason"}'
      ].join("\n"),
      state.userQuery
    );

    decision = response ? parseSupervisorDecision(response) : fallbackDecision(state.userQuery);
  } catch {
    decision = fallbackDecision(state.userQuery);
  }

  const selectedAgent: AgentName = decision.selectedAgent;
  const message = `Supervisor selected ${selectedAgent}: ${decision.reason}`;

  return {
    selectedAgent,
    supervisorReasoning: decision.reason,
    messages: [new AIMessage(message)]
  };
};
