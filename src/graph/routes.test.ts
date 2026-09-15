import { describe, expect, it } from "vitest";

import { routeFromGuardrail, routeFromSupervisor } from "./routes.js";
import type { AgentState } from "./state.js";

const baseState = {
  guardrailAllowed: true,
  selectedAgent: undefined
} as AgentState;

describe("graph routes", () => {
  it("routes allowed guardrail state to supervisor", () => {
    expect(routeFromGuardrail({ ...baseState, guardrailAllowed: true })).toBe("supervisor");
  });

  it("routes blocked guardrail state to blocked", () => {
    expect(routeFromGuardrail({ ...baseState, guardrailAllowed: false })).toBe("blocked");
  });

  it("defaults supervisor route to planner", () => {
    expect(routeFromSupervisor(baseState)).toBe("planner");
  });

  it("routes to selected specialist", () => {
    expect(routeFromSupervisor({ ...baseState, selectedAgent: "weather" })).toBe("weather");
  });
});
