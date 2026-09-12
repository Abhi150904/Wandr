import { END, START, StateGraph } from "@langchain/langgraph";

import { plannerAgent } from "../agents/planner.agent.js";
import { AgentStateAnnotation } from "./state.js";

export const buildGraph = () =>
  new StateGraph(AgentStateAnnotation)
    .addNode("planner", plannerAgent)
    .addEdge(START, "planner")
    .addEdge("planner", END)
    .compile();

export const agentGraph = buildGraph();
