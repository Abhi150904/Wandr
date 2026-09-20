import { AIMessage } from "@langchain/core/messages";
import { interrupt } from "@langchain/langgraph";
import { z } from "zod";

import type { AgentState, AgentStateUpdate } from "../graph/state.js";
import type { ApprovalInterruptPayload, ApprovalResume } from "../graph/types.js";

const approvalResumeSchema = z.object({
  approved: z.boolean(),
  feedback: z.string().optional()
});

export const approvalAgent = (state: AgentState): AgentStateUpdate => {
  const draftOutput = state.draftOutput || state.generatedOutput;
  const approvalRequest =
    "Please review the generated draft. Approve it to create the final response, or reject it with feedback for revision.";

  const review = interrupt<ApprovalInterruptPayload, ApprovalResume>({
    question: "Do you approve this draft?",
    draftOutput,
    approvalRequest,
    ...(state.selectedAgent ? { selectedAgent: state.selectedAgent } : {}),
    supervisorReasoning: state.supervisorReasoning,
    sources: state.sources,
    expectedResponse: {
      approved: true,
      feedback: "Optional revision feedback"
    }
  });

  const parsedReview = approvalResumeSchema.parse(review);

  return {
    draftOutput,
    approvalRequest,
    requiresApproval: false,
    approved: parsedReview.approved,
    humanFeedback: parsedReview.feedback?.trim() ?? "",
    sources: state.sources,
    messages: [new AIMessage("Human approval step completed.")]
  };
};
