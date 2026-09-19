import { AIMessage } from "@langchain/core/messages";
import { z } from "zod";

import { invokeGeminiText } from "../config/llm.js";
import type { AgentState, AgentStateUpdate } from "../graph/state.js";
import type { GuardrailDecision } from "../graph/types.js";

const guardrailDecisionSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().trim().min(1)
});

const parseGuardrailDecision = (text: string): GuardrailDecision => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Guardrail response did not contain a JSON object.");
  }

  return guardrailDecisionSchema.parse(JSON.parse(text.slice(start, end + 1)));
};

const fallbackGuardrailDecision = (userQuery: string): GuardrailDecision => {
  const query = userQuery.toLowerCase();

  const blockedTerms = [
    "make a bomb",
    "build a bomb",
    "steal",
    "phishing",
    "malware",
    "ransomware",
    "bypass password",
    "credit card fraud",
    "harm someone"
  ];

  if (blockedTerms.some((term) => query.includes(term))) {
    return {
      allowed: false,
      reason: "This request appears unsafe and cannot be handled by this agent workflow."
    };
  }

  const allowedTerms = [
    "best time",
    "destination",
    "destinations",
    "season",
    "seasons",
    "visit",
    "visa",
    "hotel",
    "hotels",
    "flight",
    "flights",
    "route",
    "places",
    "plan",
    "trip",
    "travel",
    "itinerary",
    "weather",
    "forecast",
    "climate",
    "research",
    "compare",
    "summarize",
    "explain",
    "build",
    "langgraph",
    "agent"
  ];

  if (allowedTerms.some((term) => query.includes(term))) {
    return {
      allowed: true,
      reason: "The request matches the planning, research, weather, or agent-building scope."
    };
  }

  return {
    allowed: false,
    reason:
      "This project currently handles planning, research, weather guidance, and agent-building requests."
  };
};

export const inputGuardrail = async (state: AgentState): Promise<AgentStateUpdate> => {
  let decision: GuardrailDecision;

  try {
    const response = await invokeGeminiText(
      [
        "You are the input guardrail for a small agent workflow.",
        "Allow requests about planning, research, weather guidance, destinations, trips, itineraries, seasons, visiting places, or building AI agent software.",
        "Block clearly unrelated requests and unsafe or illegal instructions.",
        "Do not block valid travel or research requests only because they are missing details.",
        "Examples that must be allowed: best time to visit Japan, compare Jaipur and Udaipur, what weather should I prepare for in London.",
        "Return strict JSON only with this schema:",
        '{"allowed":true,"reason":"short reason"}'
      ].join("\n"),
      state.userQuery
    );

    decision = response ? parseGuardrailDecision(response) : fallbackGuardrailDecision(state.userQuery);
  } catch {
    decision = fallbackGuardrailDecision(state.userQuery);
  }

  return {
    guardrailAllowed: decision.allowed,
    guardrailReason: decision.reason,
    messages: [new AIMessage(`Guardrail ${decision.allowed ? "allowed" : "blocked"} request: ${decision.reason}`)]
  };
};

export const blockedResponseAgent = (state: AgentState): AgentStateUpdate => {
  const generatedOutput =
    `I cannot help with this request yet. ${state.guardrailReason || "It is outside the current scope of Wandr AI."}`;

  return {
    generatedOutput,
    messages: [new AIMessage(generatedOutput)]
  };
};
