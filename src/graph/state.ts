import type { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

import type { AgentName } from "./types.js";

export const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => []
  }),
  userQuery: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => ""
  }),
  generatedOutput: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => ""
  }),
  selectedAgent: Annotation<AgentName | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined
  }),
  supervisorReasoning: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => ""
  }),
  plannerOutput: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => ""
  }),
  researcherOutput: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => ""
  }),
  weatherOutput: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => ""
  }),
  error: Annotation<string | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined
  })
});

export type AgentState = typeof AgentStateAnnotation.State;
export type AgentStateUpdate = typeof AgentStateAnnotation.Update;
