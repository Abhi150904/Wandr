import type { ApprovalInterruptPayload, ApprovalResume } from "./graph/types.js";
import { resumeRun, startRun } from "./graph/runner.js";

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
const result =
  mode === "resume"
    ? await resumeRun(threadId, resume ?? { approved: true })
    : await startRun(userQuery, threadId);

if (result.status === "requires_approval") {
  if (!result.approval) {
    console.error("Graph interrupted without an approval payload.");
    process.exit(1);
  }

  printInterrupt(result.approval, threadId);
  process.exit(0);
}

const output = result.result;

if (!output) {
  console.error("Graph completed without a result.");
  process.exit(1);
}

if (output.error) {
  console.warn("Warning: Gemini unavailable; using deterministic fallback.");
  console.log("");
}

console.log(`Checkpointer: ${result.checkpointer}`);
console.log(`Thread ID: ${threadId}`);
console.log(`Mode: ${mode}`);
console.log(`Guardrail: ${output.guardrailAllowed ? "allowed" : "blocked"}`);
console.log(`Guardrail reason: ${output.guardrailReason}`);
console.log("");

if (!output.guardrailAllowed) {
  console.log(output.generatedOutput);
  process.exit(0);
}

console.log(`Selected agent: ${output.selectedAgent ?? "planner"}`);
console.log(`Reason: ${output.supervisorReasoning}`);
console.log(`Approved: ${output.approved === undefined ? "n/a" : output.approved ? "yes" : "no"}`);
console.log("");
console.log(output.generatedOutput);
