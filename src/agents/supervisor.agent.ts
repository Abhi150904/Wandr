import { AIMessage } from "@langchain/core/messages";

import type { AgentState, AgentStateUpdate } from "../graph/state.js";
import type { AgentName, SupervisorDecision } from "../graph/types.js";

const routeRequest = (userQuery: string): SupervisorDecision => {
  const query = userQuery.toLowerCase();

  const weatherTerms = ["weather", "forecast", "rain", "temperature", "climate", "pack"];
  const researchTerms = [
    "best time",
    "compare",
    "find",
    "research",
    "explain",
    "summarize",
    "information",
    "should i",
    "which is better"
  ];

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
  const decision = routeRequest(state.userQuery);
  const selectedAgent: AgentName = decision.selectedAgent;
  const message = `Supervisor selected ${selectedAgent}: ${decision.reason}`;

  return {
    selectedAgent,
    supervisorReasoning: decision.reason,
    messages: [new AIMessage(message)]
  };
};
