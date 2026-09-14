import { HumanMessage } from "@langchain/core/messages";

import { buildGraph } from "./graph/graph.js";

const DEFAULT_QUERY = "Create a concise plan for building a TypeScript LangGraph.js agent scaffold.";
const DEFAULT_THREAD_ID = "default-cli-thread";

type CliArgs = {
  userQuery: string;
  threadId: string;
};

const parseCliArgs = (args: string[]): CliArgs => {
  const queryParts: string[] = [];
  let threadId = DEFAULT_THREAD_ID;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    const nextArg = args[index + 1];

    if ((arg === "--thread" || arg === "--thread-id") && nextArg) {
      threadId = nextArg;
      index += 1;
      continue;
    }

    if (arg?.startsWith("--thread=")) {
      threadId = arg.slice("--thread=".length);
      continue;
    }

    if (arg?.startsWith("--thread-id=")) {
      threadId = arg.slice("--thread-id=".length);
      continue;
    }

    if (arg) {
      queryParts.push(arg);
    }
  }

  return {
    userQuery: queryParts.join(" ").trim() || DEFAULT_QUERY,
    threadId: threadId.trim() || DEFAULT_THREAD_ID
  };
};

const { userQuery, threadId } = parseCliArgs(process.argv.slice(2));
const { graph: agentGraph, checkpointerKind } = await buildGraph();
const graphConfig = {
  configurable: {
    thread_id: threadId
  }
};

const result = await agentGraph.invoke({
  messages: [new HumanMessage(userQuery)],
  userQuery,
  generatedOutput: "",
  guardrailAllowed: true,
  guardrailReason: "",
  supervisorReasoning: "",
  plannerOutput: "",
  researcherOutput: "",
  weatherOutput: ""
}, graphConfig);

if (result.error && !result.generatedOutput) {
  console.error("Graph completed with an error:");
  console.error(result.error);
  process.exitCode = 1;
} else {
  if (result.error) {
    console.warn("Warning: Gemini unavailable; using deterministic fallback.");
    console.log("");
  }

  console.log(`Checkpointer: ${checkpointerKind}`);
  console.log(`Thread ID: ${threadId}`);
  console.log(`Guardrail: ${result.guardrailAllowed ? "allowed" : "blocked"}`);
  console.log(`Guardrail reason: ${result.guardrailReason}`);
  console.log("");

  if (!result.guardrailAllowed) {
    console.log(result.generatedOutput);
    process.exit(0);
  }

  console.log(`Selected agent: ${result.selectedAgent ?? "planner"}`);
  console.log(`Reason: ${result.supervisorReasoning}`);
  console.log("");
  console.log(result.generatedOutput);
}
