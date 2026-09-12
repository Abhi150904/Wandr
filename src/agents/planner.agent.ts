import { AIMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { env, hasGeminiApiKey } from "../config/env.js";
import type { AgentState, AgentStateUpdate } from "../graph/state.js";

const fallbackPlan = (userQuery: string): string => {
  const topic = userQuery.trim() || "the user's request";

  return [
    `Plan for: ${topic}`,
    "1. Clarify the task objective and desired output.",
    "2. Identify the smallest useful agent workflow.",
    "3. Execute the first graph step and capture the result.",
    "4. Defer MCP, routing, guardrails, persistence, API, and UI work to later phases."
  ].join("\n");
};

export const plannerAgent = async (state: AgentState): Promise<AgentStateUpdate> => {
  try {
    if (!hasGeminiApiKey) {
      const generatedOutput = fallbackPlan(state.userQuery);

      return {
        generatedOutput,
        messages: [new AIMessage(generatedOutput)]
      };
    }

    const geminiApiKey = env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is required to call Gemini.");
    }

    const model = new ChatGoogleGenerativeAI({
      apiKey: geminiApiKey,
      model: env.GEMINI_MODEL,
      temperature: 0
    });

    const response = await model.invoke([
      {
        role: "system",
        content:
          "You are a concise planning agent. Produce a short, practical plan for the user's request."
      },
      {
        role: "user",
        content: state.userQuery
      }
    ]);

    const generatedOutput =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    return {
      generatedOutput,
      messages: [new AIMessage(generatedOutput)]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown planner error";

    return {
      error: message,
      generatedOutput: "",
      messages: [new AIMessage(`Planner failed: ${message}`)]
    };
  }
};
