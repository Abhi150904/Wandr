import { z } from "zod";

import { env } from "../config/env.js";
import type { ResearchSource } from "../graph/types.js";

const tavilyResultSchema = z.object({
  title: z.string().catch("Untitled source"),
  url: z.string().url(),
  content: z.string().catch("")
});

const tavilyResponseSchema = z.object({
  results: z.array(tavilyResultSchema).default([])
});

const fallbackSources = (query: string): ResearchSource[] => [
  {
    title: "Wandr deterministic travel guidance",
    url: "https://example.com/wandr-local-guidance",
    snippet: `Local fallback guidance for: ${query}`
  }
];

export const searchWebWithApiKey = async (
  query: string,
  apiKey: string | undefined
): Promise<ResearchSource[]> => {
  const normalizedQuery = query.trim();

  if (!normalizedQuery || !apiKey) {
    return fallbackSources(normalizedQuery || "travel research");
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: normalizedQuery,
        search_depth: "basic",
        max_results: 3,
        include_answer: false,
        include_raw_content: false
      })
    });

    if (!response.ok) {
      return fallbackSources(normalizedQuery);
    }

    const payload: unknown = await response.json();
    const parsed = tavilyResponseSchema.safeParse(payload);

    if (!parsed.success || parsed.data.results.length === 0) {
      return fallbackSources(normalizedQuery);
    }

    return parsed.data.results.slice(0, 3).map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.content.trim().slice(0, 280)
    }));
  } catch {
    return fallbackSources(normalizedQuery);
  }
};

export const searchWeb = async (query: string): Promise<ResearchSource[]> =>
  searchWebWithApiKey(query, env.TAVILY_API_KEY);
