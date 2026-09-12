import { END, START, StateGraph } from "@langchain/langgraph";

import { plannerAgent } from "../agents/planner.agent.js";
import { researcherAgent } from "../agents/researcher.agent.js";
import { supervisorAgent } from "../agents/supervisor.agent.js";
import { weatherAgent } from "../agents/weather.agent.js";
import { routeFromSupervisor } from "./routes.js";
import { AgentStateAnnotation } from "./state.js";

export const buildGraph = () =>
  new StateGraph(AgentStateAnnotation)
    .addNode("supervisor", supervisorAgent)
    .addNode("planner", plannerAgent)
    .addNode("researcher", researcherAgent)
    .addNode("weather", weatherAgent)
    .addEdge(START, "supervisor")
    .addConditionalEdges("supervisor", routeFromSupervisor, {
      planner: "planner",
      researcher: "researcher",
      weather: "weather"
    })
    .addEdge("planner", END)
    .addEdge("researcher", END)
    .addEdge("weather", END)
    .compile();

export const agentGraph = buildGraph();
