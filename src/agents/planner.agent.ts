import { AIMessage } from "@langchain/core/messages";

import { invokeGeminiText } from "../config/llm.js";
import type { AgentState, AgentStateUpdate } from "../graph/state.js";
import type { ResearchSource } from "../graph/types.js";
import { searchWeb } from "../tools/web-search.tool.js";

const extractDestination = (userQuery: string): string => {
  const cleaned = userQuery
    .replace(/[?.!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const destinationMatch =
    /\b(?:trip|itinerary|plan)\s+to\s+([A-Za-z][A-Za-z\s.'-]{1,60}?)(?:\s+from\b|,|\s+starting\b|\s+start\b|$)/i.exec(
      cleaned
    ) ??
    /\b(?:visit|visiting|to|in|for)\s+([A-Za-z][A-Za-z\s.'-]{1,60}?)(?:\s+from\b|,|\s+starting\b|\s+start\b|$)/i.exec(
      cleaned
    );
  const destination = destinationMatch?.[1]?.trim();

  if (!destination) return cleaned || "your destination";

  return destination.replace(/\b(?:for|in|during|on)\b.*$/i, "").trim() || destination;
};

const inferTripLength = (userQuery: string): "weekend" | "short" => {
  const query = userQuery.toLowerCase();

  return query.includes("weekend") || query.includes("2 day") || query.includes("two day")
    ? "weekend"
    : "short";
};

const sourceBackedFallbackPlan = (
  destination: string,
  sources: ResearchSource[]
): string | undefined => {
  const realSources = sources.filter(
    (source) => !source.url.includes("example.com/wandr-local-guidance")
  );

  if (realSources.length === 0) return undefined;

  return [
    `Weekend plan for ${destination}`,
    "1. Day 1 morning: Arrive, check in or drop bags, then start with the main old-town, landmark, or central sightseeing area.",
    "2. Day 1 afternoon: Group nearby attractions together and keep lunch close to that area so the day does not get eaten by transit.",
    "3. Day 1 evening: Choose one walkable zone for dinner, markets, viewpoints, or a relaxed local experience.",
    "4. Day 2 morning: Use the freshest part of the day for the strongest outdoor stop, fort, museum, nature area, or guided experience.",
    "5. Day 2 afternoon: Keep a lighter backup plan for shopping, cafes, short walks, or the return journey.",
    "6. Before booking: Use the sources below to confirm exact attractions, opening hours, live weather, road conditions, local holidays, and reservation needs."
  ].join("\n");
};

const fallbackPlan = (userQuery: string, sources: ResearchSource[] = []): string => {
  const destination = extractDestination(userQuery);
  const tripLength = inferTripLength(userQuery);
  const sourceBacked = sourceBackedFallbackPlan(destination, sources);
  if (sourceBacked) return sourceBacked;

  const title = tripLength === "weekend" ? `Weekend plan for ${destination}` : `Trip plan for ${destination}`;

  return [
    title,
    "1. Day 1 morning: Arrive, check in or drop bags, and start with the destination's main landmark or most time-sensitive attraction.",
    "2. Day 1 afternoon: Group nearby sights together, then pause for a local lunch or cafe break instead of crossing town repeatedly.",
    "3. Day 1 evening: Choose one walkable area for dinner, markets, viewpoints, or a relaxed local experience.",
    "4. Day 2 morning: Use the freshest part of the day for the best outdoor activity, museum, old-town walk, nature stop, or guided experience.",
    "5. Day 2 afternoon: Keep this lighter for shopping, food, a backup attraction, and the return journey.",
    "6. Before booking: Confirm opening hours, weather, transport time, local holidays, and reservation needs."
  ].join("\n");
};

export const plannerAgent = async (state: AgentState): Promise<AgentStateUpdate> => {
  const sources = await searchWeb(state.userQuery);
  const sourceContext = sources
    .map((source, index) => `${index + 1}. ${source.title}\n${source.url}\n${source.snippet}`)
    .join("\n\n");

  try {
    const generatedOutput =
      (await invokeGeminiText(
        [
          "You are a travel planning agent.",
          "Produce a short, practical, user-facing itinerary or action plan for the exact destination or task.",
          "Use the provided web search snippets as grounding when they are relevant.",
          "Include concrete places and timing when the request is about travel.",
          "Avoid meta-planning checklists unless the user explicitly asks for planning methodology.",
          "Do not invent source details beyond the snippets."
        ].join("\n"),
        [`User request:\n${state.userQuery}`, `Search sources:\n${sourceContext}`].join("\n\n")
      )) ?? fallbackPlan(state.userQuery, sources);

    return {
      generatedOutput,
      draftOutput: generatedOutput,
      plannerOutput: generatedOutput,
      sources,
      messages: [new AIMessage(generatedOutput)]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown planner error";
    const generatedOutput = fallbackPlan(state.userQuery, sources);

    return {
      ...(sources.length === 0 ? { error: message } : {}),
      generatedOutput,
      draftOutput: generatedOutput,
      plannerOutput: generatedOutput,
      sources,
      messages: [new AIMessage(`Planner fallback used after error: ${message}`)]
    };
  }
};
