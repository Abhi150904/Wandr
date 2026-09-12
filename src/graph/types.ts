import type { BaseMessage } from "@langchain/core/messages";

export type AgentGraphState = {
  messages: BaseMessage[];
  userQuery: string;
  generatedOutput: string;
  error?: string;
};

export type AgentGraphUpdate = Partial<AgentGraphState>;
