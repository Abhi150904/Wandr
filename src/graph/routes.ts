import type { AgentState } from "./state.js";
import type { AgentName } from "./types.js";

export type GuardrailRoute = "supervisor" | "blocked";

export const routeFromGuardrail = (state: AgentState): GuardrailRoute =>
  state.guardrailAllowed ? "supervisor" : "blocked";

export const routeFromSupervisor = (state: AgentState): AgentName =>
  state.selectedAgent ?? "planner";
