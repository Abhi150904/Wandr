import { END, START, StateGraph } from "@langchain/langgraph";

import { plannerAgent } from "../agents/planner.agent.js";
import { researcherAgent } from "../agents/researcher.agent.js";
import { supervisorAgent } from "../agents/supervisor.agent.js";
import { weatherAgent } from "../agents/weather.agent.js";
import { blockedResponseAgent, inputGuardrail } from "../guardrails/input.guardrail.js";
import { createCheckpointer } from "./checkpointer.js";
import { routeFromGuardrail, routeFromSupervisor } from "./routes.js";
import { AgentStateAnnotation } from "./state.js";

export const buildGraph = async () => {
  const { checkpointer, kind } = await createCheckpointer();
  const graph = new StateGraph(AgentStateAnnotation)
    .addNode("guardrail", inputGuardrail)
    .addNode("blocked", blockedResponseAgent)
    .addNode("supervisor", supervisorAgent)
    .addNode("planner", plannerAgent)
    .addNode("researcher", researcherAgent)
    .addNode("weather", weatherAgent)
    .addEdge(START, "guardrail")
    .addConditionalEdges("guardrail", routeFromGuardrail, {
      supervisor: "supervisor",
      blocked: "blocked"
    })
    .addConditionalEdges("supervisor", routeFromSupervisor, {
      planner: "planner",
      researcher: "researcher",
      weather: "weather"
    })
    .addEdge("blocked", END)
    .addEdge("planner", END)
    .addEdge("researcher", END)
    .addEdge("weather", END)
    .compile({
      checkpointer
    });

  return {
    graph,
    checkpointerKind: kind
  };
};
