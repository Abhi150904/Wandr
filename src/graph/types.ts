import type { BaseMessage } from "@langchain/core/messages";

export const AGENT_NAMES = ["planner", "researcher", "weather"] as const;

export type AgentName = (typeof AGENT_NAMES)[number];

export type SupervisorDecision = {
  selectedAgent: AgentName;
  reason: string;
};

export type GuardrailDecision = {
  allowed: boolean;
  reason: string;
};

export type AgentGraphState = {
  messages: BaseMessage[];
  userQuery: string;
  generatedOutput: string;
  guardrailAllowed: boolean;
  guardrailReason: string;
  selectedAgent?: AgentName;
  supervisorReasoning: string;
  plannerOutput: string;
  researcherOutput: string;
  weatherOutput: string;
  error?: string;
};

export type AgentGraphUpdate = Partial<AgentGraphState>;
