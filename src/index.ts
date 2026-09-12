import { HumanMessage } from "@langchain/core/messages";

import { agentGraph } from "./graph/graph.js";

const DEFAULT_QUERY = "Create a concise plan for building a TypeScript LangGraph.js agent scaffold.";

const userQuery = process.argv.slice(2).join(" ").trim() || DEFAULT_QUERY;

const result = await agentGraph.invoke({
  messages: [new HumanMessage(userQuery)],
  userQuery,
  generatedOutput: ""
});

if (result.error) {
  console.error("Graph completed with an error:");
  console.error(result.error);
  process.exitCode = 1;
} else {
  console.log(result.generatedOutput);
}
