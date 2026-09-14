import { END, START, StateGraph } from "@langchain/langgraph";

import { approvalAgent } from "../agents/approval.agent.js";
import { finalAgent } from "../agents/final.agent.js";
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
    .addNode("approval", approvalAgent)
    .addNode("final", finalAgent)
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
    .addEdge("planner", "approval")
    .addEdge("researcher", "approval")
    .addEdge("weather", "approval")
    .addEdge("approval", "final")
    .addEdge("final", END)
    .compile({
      checkpointer
    });

  return {
    graph,
    checkpointerKind: kind
  };
};
