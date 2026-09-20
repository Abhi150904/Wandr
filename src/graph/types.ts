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

export type ApprovalResume = {
  approved: boolean;
  feedback?: string | undefined;
};

export type ResearchSource = {
  title: string;
  url: string;
  snippet: string;
};

export type ApprovalInterruptPayload = {
  question: string;
  draftOutput: string;
  approvalRequest: string;
  selectedAgent?: AgentName | undefined;
  supervisorReasoning: string;
  sources: ResearchSource[];
  expectedResponse: ApprovalResume;
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
  draftOutput: string;
  approvalRequest: string;
  requiresApproval: boolean;
  approved?: boolean;
  humanFeedback: string;
  finalOutput: string;
  sources: ResearchSource[];
  error?: string;
};

export type AgentGraphUpdate = Partial<AgentGraphState>;
