import { HumanMessage } from "@langchain/core/messages";

import { agentGraph } from "./graph/graph.js";

const DEFAULT_QUERY = "Create a concise plan for building a TypeScript LangGraph.js agent scaffold.";

const userQuery = process.argv.slice(2).join(" ").trim() || DEFAULT_QUERY;

const result = await agentGraph.invoke({
  messages: [new HumanMessage(userQuery)],
  userQuery,
  generatedOutput: "",
  supervisorReasoning: "",
  plannerOutput: "",
  researcherOutput: "",
  weatherOutput: ""
});

if (result.error && !result.generatedOutput) {
  console.error("Graph completed with an error:");
  console.error(result.error);
  process.exitCode = 1;
} else {
  if (result.error) {
    console.warn(`Warning: ${result.error}`);
    console.log("");
  }

  console.log(`Selected agent: ${result.selectedAgent ?? "planner"}`);
  console.log(`Reason: ${result.supervisorReasoning}`);
  console.log("");
  console.log(result.generatedOutput);
}
