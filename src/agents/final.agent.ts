import { AIMessage } from "@langchain/core/messages";

import { invokeGeminiText } from "../config/llm.js";
import type { AgentState, AgentStateUpdate } from "../graph/state.js";

const fallbackFinal = (state: AgentState): string => {
  const draft = state.draftOutput || state.generatedOutput;

  if (state.approved) {
    return [
      "Final response",
      "",
      draft,
      "",
      "Status: Approved by human reviewer."
    ].join("\n");
  }

  return [
    "Revised final response",
    "",
    draft,
    "",
    `Human feedback applied: ${state.humanFeedback || "Improve the draft before finalizing."}`
  ].join("\n");
};

export const finalAgent = async (state: AgentState): Promise<AgentStateUpdate> => {
  const draft = state.draftOutput || state.generatedOutput;

  if (state.approved) {
    const finalOutput = fallbackFinal(state);

    return {
      generatedOutput: finalOutput,
      finalOutput,
      sources: state.sources,
      messages: [new AIMessage(finalOutput)]
    };
  }

  const reviewInstruction = state.approved
    ? "The human approved the draft. Preserve its substance while polishing the final response."
    : `The human requested revision. Apply this feedback carefully: ${state.humanFeedback || "Improve the draft before finalizing."}`;

  try {
    const finalOutput =
      (await invokeGeminiText(
        [
          "You are the final response agent.",
          "Create a concise, polished final answer from the draft and human review.",
          "Do not invent external facts."
        ].join("\n"),
        [
          `User request:\n${state.userQuery}`,
          `Selected agent: ${state.selectedAgent ?? "unknown"}`,
          `Human review:\n${reviewInstruction}`,
          `Draft:\n${draft}`
        ].join("\n\n")
      )) ?? fallbackFinal(state);

    return {
      generatedOutput: finalOutput,
      finalOutput,
      sources: state.sources,
      messages: [new AIMessage(finalOutput)]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown final agent error";
    const finalOutput = fallbackFinal(state);

    return {
      error: message,
      generatedOutput: finalOutput,
      finalOutput,
      sources: state.sources,
      messages: [new AIMessage(`Final fallback used after error: ${message}`)]
    };
  }
};
