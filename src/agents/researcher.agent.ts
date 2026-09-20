import { AIMessage } from "@langchain/core/messages";

import { invokeGeminiText } from "../config/llm.js";
import type { AgentState, AgentStateUpdate } from "../graph/state.js";
import type { ResearchSource } from "../graph/types.js";
import { searchWeb } from "../tools/web-search.tool.js";

const extractVisitDestination = (userQuery: string): string => {
  const match = userQuery.match(/\b(?:visit|to)\s+([a-zA-Z\s]+?)(?:\?|\.|,|$)/i);
  return match?.[1]?.trim() || "the destination";
};

const sourceBackedFallbackResearch = (
  userQuery: string,
  sources: ResearchSource[]
): string | undefined => {
  const realSources = sources.filter(
    (source) => !source.url.includes("example.com/wandr-local-guidance")
  );

  if (realSources.length === 0) return undefined;

  const sourceLines = realSources.slice(0, 3).map((source, index) => {
    const snippet = source.snippet.replace(/\s+/g, " ").trim();
    return `${index + 1}. ${source.title}: ${snippet}`;
  });

  return [
    `Research brief for: ${userQuery}`,
    ...sourceLines,
    `${sourceLines.length + 1}. Recommendation: use the sources above as the starting point, then confirm dates, prices, transport times, and seasonal conditions before booking.`
  ].join("\n");
};

const fallbackResearch = (userQuery: string, sources: ResearchSource[] = []): string => {
  const sourceBacked = sourceBackedFallbackResearch(userQuery, sources);
  if (sourceBacked) return sourceBacked;

  const query = userQuery.toLowerCase();
  const destination = extractVisitDestination(userQuery);

  if (query.includes("japan") && (query.includes("best time") || query.includes("visit"))) {
    return [
      "Best time to visit Japan",
      "1. Spring, especially late March to April, is usually the most popular window because of cherry blossoms, mild weather, and strong first-trip appeal.",
      "2. Autumn, especially October to November, is often the best overall balance: comfortable temperatures, colorful foliage, and less humidity than summer.",
      "3. Summer can work for festivals and mountain areas, but expect heat, humidity, and possible typhoon disruption later in the season.",
      "4. Winter is strongest for skiing, onsens, clear city days, and fewer crowds outside the New Year period.",
      "5. For a first Japan trip, choose spring for iconic scenery or autumn for the most comfortable travel experience."
    ].join("\n");
  }

  if (query.includes("best time") || query.includes("visit") || query.includes("season")) {
    return [
      `Best time to visit ${destination}`,
      "1. Start with the shoulder seasons, when weather is usually comfortable and major sights are less crowded than peak holiday periods.",
      "2. Check local climate patterns before booking, especially monsoon, storm, snow, or extreme heat windows.",
      "3. Match the timing to your trip goal: sightseeing, food, festivals, beaches, hiking, or budget travel can each favor a different season.",
      "4. Avoid major local holidays if you want lower prices and easier reservations.",
      "5. Treat this as a planning brief; confirm exact dates with live weather, event, and fare data before booking."
    ].join("\n");
  }

  return [
    `Research brief for: ${userQuery}`,
    "1. Define the destination, timing, budget, and traveler preferences before making a recommendation.",
    "2. Compare weather, crowd levels, transport effort, and booking risk.",
    "3. Separate stable travel guidance from details that need live confirmation, such as prices, events, and current conditions.",
    "4. Turn the findings into a short recommendation with tradeoffs and next actions."
  ].join("\n");
};

export const researcherAgent = async (state: AgentState): Promise<AgentStateUpdate> => {
  const sources = await searchWeb(state.userQuery);
  const sourceContext = sources
    .map((source, index) => `${index + 1}. ${source.title}\n${source.url}\n${source.snippet}`)
    .join("\n\n");

  try {
    const generatedOutput =
      (await invokeGeminiText(
        [
          "You are a careful travel research agent.",
          "Use the provided web search snippets as grounding when they are relevant.",
          "Write a concise answer with practical tradeoffs.",
          "Do not invent source details beyond the snippets."
        ].join("\n"),
        [`User request:\n${state.userQuery}`, `Search sources:\n${sourceContext}`].join("\n\n")
      )) ?? fallbackResearch(state.userQuery, sources);

    return {
      generatedOutput,
      draftOutput: generatedOutput,
      researcherOutput: generatedOutput,
      sources,
      messages: [new AIMessage(generatedOutput)]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown researcher error";
    const generatedOutput = fallbackResearch(state.userQuery, sources);

    return {
      ...(sources.length === 0 ? { error: message } : {}),
      generatedOutput,
      draftOutput: generatedOutput,
      researcherOutput: generatedOutput,
      sources,
      messages: [new AIMessage(`Researcher fallback used after error: ${message}`)]
    };
  }
};
