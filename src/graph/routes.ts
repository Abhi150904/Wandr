import type { AgentState } from "./state.js";
import type { AgentName } from "./types.js";

export const routeFromSupervisor = (state: AgentState): AgentName =>
  state.selectedAgent ?? "planner";
