import { HumanMessage } from "@langchain/core/messages";
import { Command, isInterrupted } from "@langchain/langgraph";
import { z } from "zod";

import { buildGraph } from "./graph.js";
import {
  AGENT_NAMES,
  type AgentName,
  type ApprovalInterruptPayload,
  type ApprovalResume
} from "./types.js";

export type RunStatus = "requires_approval" | "completed";

export type RunResult = {
  success: true;
  status: RunStatus;
  threadId: string;
  checkpointer: "memory" | "postgres";
  approval?: ApprovalInterruptPayload;
  result?: {
    guardrailAllowed: boolean;
    guardrailReason: string;
    selectedAgent?: AgentName;
    supervisorReasoning: string;
    approved?: boolean;
    generatedOutput: string;
    finalOutput: string;
    error?: string;
  };
};

const approvalInterruptPayloadSchema = z.object({
  question: z.string(),
  draftOutput: z.string(),
  approvalRequest: z.string(),
  selectedAgent: z.enum(AGENT_NAMES).optional(),
  supervisorReasoning: z.string(),
  expectedResponse: z.object({
    approved: z.boolean(),
    feedback: z.string().optional()
  })
});

const toRunResult = (
  result: Record<string, unknown>,
  threadId: string,
  checkpointer: "memory" | "postgres"
): RunResult => {
  if (isInterrupted(result)) {
    return {
      success: true,
      status: "requires_approval",
      threadId,
      checkpointer,
      approval: approvalInterruptPayloadSchema.parse(result.__interrupt__[0]?.value)
    };
  }

  const selectedAgent = AGENT_NAMES.includes(result.selectedAgent as AgentName)
    ? (result.selectedAgent as AgentName)
    : undefined;
  const approved = typeof result.approved === "boolean" ? result.approved : undefined;
  const error = typeof result.error === "string" ? result.error : undefined;

  return {
    success: true,
    status: "completed",
    threadId,
    checkpointer,
    result: {
      guardrailAllowed: Boolean(result.guardrailAllowed),
      guardrailReason: String(result.guardrailReason ?? ""),
      ...(selectedAgent ? { selectedAgent } : {}),
      supervisorReasoning: String(result.supervisorReasoning ?? ""),
      ...(approved !== undefined ? { approved } : {}),
      generatedOutput: String(result.generatedOutput ?? ""),
      finalOutput: String(result.finalOutput ?? ""),
      ...(error ? { error } : {})
    }
  };
};

export const startRun = async (message: string, threadId: string): Promise<RunResult> => {
  const { graph, checkpointerKind } = await buildGraph();
  const result = await graph.invoke(
    {
      messages: [new HumanMessage(message)],
      userQuery: message,
      generatedOutput: "",
      guardrailAllowed: true,
      guardrailReason: "",
      supervisorReasoning: "",
      plannerOutput: "",
      researcherOutput: "",
      weatherOutput: "",
      draftOutput: "",
      approvalRequest: "",
      requiresApproval: false,
      humanFeedback: "",
      finalOutput: ""
    },
    {
      configurable: {
        thread_id: threadId
      }
    }
  );

  return toRunResult(result as Record<string, unknown>, threadId, checkpointerKind);
};

export const resumeRun = async (
  threadId: string,
  approval: ApprovalResume
): Promise<RunResult> => {
  const { graph, checkpointerKind } = await buildGraph();
  const result = await graph.invoke(
    new Command({ resume: approval }),
    {
      configurable: {
        thread_id: threadId
      }
    }
  );

  return toRunResult(result as Record<string, unknown>, threadId, checkpointerKind);
};
