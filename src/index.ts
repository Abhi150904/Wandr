import { HumanMessage } from "@langchain/core/messages";
import { Command, isInterrupted } from "@langchain/langgraph";
import { z } from "zod";

import { buildGraph } from "./graph/graph.js";
import { AGENT_NAMES, type ApprovalInterruptPayload, type ApprovalResume } from "./graph/types.js";

const DEFAULT_QUERY = "Create a concise plan for building a TypeScript LangGraph.js agent scaffold.";
const DEFAULT_THREAD_ID = "default-cli-thread";

type CliArgs = {
  userQuery: string;
  threadId: string;
  mode: "start" | "resume";
  resume: ApprovalResume | null;
};

const parseCliArgs = (args: string[]): CliArgs => {
  const queryParts: string[] = [];
  let threadId = DEFAULT_THREAD_ID;
  let mode: "start" | "resume" = "start";
  let approved: boolean | undefined;
  let feedback = "";

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    const nextArg = args[index + 1];

    if (arg === "--resume" && nextArg) {
      mode = "resume";
      threadId = nextArg;
      index += 1;
      continue;
    }

    if (arg?.startsWith("--resume=")) {
      mode = "resume";
      threadId = arg.slice("--resume=".length);
      continue;
    }

    if (arg === "--approve") {
      approved = true;
      continue;
    }

    if (arg === "--reject") {
      approved = false;
      continue;
    }

    if (arg === "--feedback" && nextArg) {
      feedback = nextArg;
      index += 1;
      continue;
    }

    if (arg?.startsWith("--feedback=")) {
      feedback = arg.slice("--feedback=".length);
      continue;
    }

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
    threadId: threadId.trim() || DEFAULT_THREAD_ID,
    mode,
    resume:
      mode === "resume"
        ? {
            approved: approved ?? true,
            feedback
          }
        : null
  };
};

const approvalInterruptPayloadSchema = z.object({
  question: z.string(),
  draftOutput: z.string(),
  approvalRequest: z.string(),
  selectedAgent: z.enum(AGENT_NAMES).optional(),
  supervisorReasoning: z.string(),
  expectedResponse: z.object({
    approved: z.boolean(),
    feedback: z.string().optional()
  })
});

const printInterrupt = (payload: ApprovalInterruptPayload, threadId: string): void => {
  console.log(`Thread ID: ${threadId}`);
  console.log("Approval required");
  console.log("");
  console.log(payload.question);
  console.log(payload.approvalRequest);
  console.log("");
  console.log("Draft:");
  console.log(payload.draftOutput);
  console.log("");
  console.log("Resume commands:");
  console.log(`npm run dev -- --resume ${threadId} --approve`);
  console.log(`npm run dev -- --resume ${threadId} --reject --feedback "Your revision notes"`);
};

const { userQuery, threadId, mode, resume } = parseCliArgs(process.argv.slice(2));
const { graph: agentGraph, checkpointerKind } = await buildGraph();
const graphConfig = {
  configurable: {
    thread_id: threadId
  }
};

const result =
  mode === "resume"
    ? await agentGraph.invoke(new Command({ resume: resume ?? { approved: true } }), graphConfig)
    : await agentGraph.invoke({
        messages: [new HumanMessage(userQuery)],
        userQuery,
        generatedOutput: "",
        guardrailAllowed: true,
        guardrailReason: "",
        supervisorReasoning: "",
        plannerOutput: "",
        researcherOutput: "",
        weatherOutput: "",
        draftOutput: "",
        approvalRequest: "",
        requiresApproval: false,
        humanFeedback: "",
        finalOutput: ""
      }, graphConfig);

if (isInterrupted(result)) {
  const payload = approvalInterruptPayloadSchema.parse(result.__interrupt__[0]?.value);
  printInterrupt(payload, threadId);
  process.exit(0);
}

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
  console.log(`Mode: ${mode}`);
  console.log(`Guardrail: ${result.guardrailAllowed ? "allowed" : "blocked"}`);
  console.log(`Guardrail reason: ${result.guardrailReason}`);
  console.log("");

  if (!result.guardrailAllowed) {
    console.log(result.generatedOutput);
    process.exit(0);
  }

  console.log(`Selected agent: ${result.selectedAgent ?? "planner"}`);
  console.log(`Reason: ${result.supervisorReasoning}`);
  console.log(`Approved: ${result.approved === undefined ? "n/a" : result.approved ? "yes" : "no"}`);
  console.log("");
  console.log(result.generatedOutput);
}
