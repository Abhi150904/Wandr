import { describe, expect, it } from "vitest";

import { buildPackingAdvice, getMockWeather, weatherToolInputSchema } from "./weather.tool.js";

describe("weather tool", () => {
  it("returns deterministic mock weather for a city", () => {
    const first = getMockWeather({ city: "london" });
    const second = getMockWeather({ city: "London" });

    expect(first).toEqual(second);
    expect(first.city).toBe("London");
    expect(first.source).toBe("mock-mcp-weather");
  });

  it("rejects empty city input", () => {
    expect(() => weatherToolInputSchema.parse({ city: "" })).toThrow();
  });

  it("builds condition-aware packing advice", () => {
    expect(buildPackingAdvice(31, "clear sky")).toContain("Prioritize hydration.");
    expect(buildPackingAdvice(18, "light rain")).toContain("Carry a compact umbrella or rain jacket.");
  });
});
