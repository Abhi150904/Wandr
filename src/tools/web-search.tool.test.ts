import { describe, expect, it, vi, afterEach } from "vitest";

import { searchWebWithApiKey } from "./web-search.tool.js";

describe("web search tool", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns sanitized Tavily search results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              title: "Japan Guide",
              url: "https://example.com/japan",
              content: "A concise overview of seasonal travel in Japan."
            }
          ]
        })
      })
    );

    const results = await searchWebWithApiKey("best time to visit Japan", "test-key");

    expect(results).toEqual([
      {
        title: "Japan Guide",
        url: "https://example.com/japan",
        snippet: "A concise overview of seasonal travel in Japan."
      }
    ]);
  });

  it("falls back when Tavily fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false
      })
    );

    const results = await searchWebWithApiKey("best time to visit Japan", "test-key");

    expect(results[0]?.title).toBe("Wandr deterministic travel guidance");
  });
});
