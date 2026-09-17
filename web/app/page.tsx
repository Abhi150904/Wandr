"use client";

import {
  ArrowRight,
  Check,
  CircleDashed,
  CloudSun,
  ClipboardCheck,
  Compass,
  MapPinned,
  MessageSquareText,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Route,
  Search,
  Shield,
  Sun,
  X
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type AgentName = "planner" | "researcher" | "weather";

type ApprovalPayload = {
  question: string;
  draftOutput: string;
  approvalRequest: string;
  selectedAgent?: AgentName;
  supervisorReasoning: string;
};

type RunResult = {
  guardrailAllowed: boolean;
  guardrailReason: string;
  selectedAgent?: AgentName;
  supervisorReasoning: string;
  approved?: boolean;
  generatedOutput: string;
  finalOutput: string;
  error?: string;
};

type ApiRunResponse =
  | {
      success: true;
      status: "requires_approval";
      threadId: string;
      checkpointer: "memory" | "postgres";
      approval: ApprovalPayload;
    }
  | {
      success: true;
      status: "completed";
      threadId: string;
      checkpointer: "memory" | "postgres";
      result: RunResult;
    };

type ApiErrorResponse = {
  success?: false;
  error?: {
    message?: string;
  };
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3000";

const starterPrompts = [
  "Find the best time to visit Japan",
  "Compare Jaipur and Udaipur for a weekend trip",
  "What should I know before visiting London in January?"
];

const modeOptions = [
  {
    id: "plan",
    label: "Plan",
    description: "Turn research into an itinerary",
    prompt: "Plan a weekend trip to Jaipur",
    icon: MapPinned
  },
  {
    id: "weather",
    label: "Weather",
    description: "Understand conditions",
    prompt: "What should I know before visiting London in January?",
    icon: CloudSun
  },
  {
    id: "research",
    label: "Research",
    description: "Compare destinations",
    prompt: "Find the best time to visit Japan",
    icon: Search
  }
] as const;

type ModeId = (typeof modeOptions)[number]["id"];
type Theme = "dark" | "light";

const createThreadId = () => `web-${Date.now().toString(36)}`;

const isApiRunResponse = (payload: unknown): payload is ApiRunResponse => {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Partial<ApiRunResponse>;
  return candidate.success === true && (candidate.status === "requires_approval" || candidate.status === "completed");
};

const getApiErrorMessage = (payload: unknown, fallback: string) => {
  const candidate = payload as ApiErrorResponse;
  return candidate.error?.message ?? fallback;
};

export default function Home() {
  const [message, setMessage] = useState(starterPrompts[0]);
  const [activeMode, setActiveMode] = useState<ModeId>("research");
  const [theme, setTheme] = useState<Theme>("dark");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [threadId, setThreadId] = useState("new-thread");
  const [feedback, setFeedback] = useState("");
  const [run, setRun] = useState<ApiRunResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = useMemo(() => {
    if (!run) return "Idle";
    return run.status === "requires_approval" ? "Awaiting review" : "Completed";
  }, [run]);

  const selectedAgent =
    run?.status === "requires_approval" ? run.approval.selectedAgent : run?.result.selectedAgent;
  const guardrail =
    run?.status === "completed"
      ? run.result.guardrailAllowed
        ? "Allowed"
        : "Blocked"
      : run
        ? "Allowed"
        : "Pending";
  const approvalLabel =
    run?.status === "completed"
      ? run.result.approved === undefined
        ? "n/a"
        : run.result.approved
          ? "approved"
          : "revised"
      : run?.status === "requires_approval"
        ? "waiting"
        : "pending";
  const outputText =
    run?.status === "completed"
      ? run.result.generatedOutput
      : run?.status === "requires_approval"
        ? run.approval.draftOutput
        : "";
  const planStage = !run ? "Ready to plan" : run.status === "requires_approval" ? "Ready for review" : "Plan finalized";
  const requestCheck = guardrail === "Allowed" ? "Looks good" : guardrail === "Blocked" ? "Needs changes" : "Pending";
  const selectedMode = modeOptions.find((mode) => mode.id === activeMode) ?? modeOptions[0];
  const isLightTheme = theme === "light";

  const selectMode = (mode: (typeof modeOptions)[number]) => {
    setActiveMode(mode.id);
    setMessage(mode.prompt);
  };

  const startRun = async (event?: FormEvent) => {
    event?.preventDefault();
    setIsLoading(true);
    setError(null);
    setFeedback("");
    const activeThreadId = threadId === "new-thread" ? createThreadId() : threadId;
    setThreadId(activeThreadId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/runs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          threadId: activeThreadId
        })
      });

      const payload: unknown = await response.json();

      if (!response.ok || !isApiRunResponse(payload)) {
        throw new Error(getApiErrorMessage(payload, "Run failed."));
      }

      setRun(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Run failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const resumeRun = async (approved: boolean) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/runs/${threadId}/resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          approved,
          feedback
        })
      });

      const payload: unknown = await response.json();

      if (!response.ok || !isApiRunResponse(payload)) {
        throw new Error(getApiErrorMessage(payload, "Resume failed."));
      }

      setRun(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Resume failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetRun = () => {
    setRun(null);
    setFeedback("");
    setError(null);
    setThreadId(createThreadId());
  };

  return (
    <main className="app-shell" data-sidebar={isSidebarCollapsed ? "collapsed" : "expanded"} data-theme={theme}>
      <aside className="brand-panel">
        <div className="brand-lockup">
          <div className="brand-mark">W</div>
          <div>
            <strong>Wandr AI</strong>
            <span>Research trips before you book</span>
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <div className="mode-list" aria-label="Planning modes">
          {modeOptions.map((mode) => {
            const Icon = mode.icon;

            return (
              <button
                className={mode.id === activeMode ? "active" : ""}
                key={mode.id}
                onClick={() => selectMode(mode)}
                title={`${mode.label}: ${mode.description}`}
                type="button"
              >
                <Icon size={17} />
                <span>
                  <strong>{mode.label}</strong>
                  <small>{mode.description}</small>
                </span>
              </button>
            );
          })}
        </div>

        <div className="sidebar-note">
          <Shield size={15} />
          <p>Every answer pauses for review, so you can approve it or ask for changes.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="crumb">
            <span className="live-dot" />
            <span>Research workspace</span>
          </div>
          <div className="status-strip">
            <span>{status}</span>
            <span>{selectedAgent ? `${selectedAgent} mode` : "ready"}</span>
            <button className="theme-toggle" onClick={() => setTheme(isLightTheme ? "dark" : "light")} type="button">
              {isLightTheme ? <Moon size={14} /> : <Sun size={14} />}
              {isLightTheme ? "Dark" : "Light"}
            </button>
          </div>
        </header>

        <div className="content-grid">
          <section className="run-lane" id="run">
            <div className="lane-header">
              <div>
                <p className="eyebrow">{selectedMode.label} mode</p>
                <h1>Research your next trip with Wandr.</h1>
              </div>
              <button className="ghost-button" type="button" onClick={resetRun}>
                <RefreshCw size={15} />
                New request
              </button>
            </div>

            <form className="query-dock" onSubmit={startRun}>
              <div className="dock-toolbar">
                <span>
                  <MessageSquareText size={14} />
                  Ask a travel research question
                </span>
                <span>Compare places, timing, weather, and itineraries</span>
              </div>
              <textarea
                id="message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ask about a destination, season, route, budget, or itinerary..."
              />
              <div className="dock-footer">
                <div className="prompt-bank" aria-label="Starter prompts">
                  {starterPrompts.map((prompt) => (
                    <button key={prompt} type="button" onClick={() => {
                      setMessage(prompt);
                      const matchingMode = modeOptions.find((mode) => mode.prompt === prompt);
                      if (matchingMode) setActiveMode(matchingMode.id);
                    }} title={prompt}>
                      <ArrowRight size={13} />
                      {prompt}
                    </button>
                  ))}
                </div>
                <button className="run-button" disabled={isLoading} type="submit">
                  {isLoading ? <CircleDashed className="spin" size={16} /> : <Route size={16} />}
                  Create plan
                </button>
              </div>
            </form>

            {error ? <div className="error-line">{error}</div> : null}

            <section className="handoff-surface" id="review">
              <div className="surface-heading">
                <div>
                  <p className="eyebrow">{run?.status === "completed" ? "Ready" : "Draft review"}</p>
                  <h2>{run?.status === "completed" ? "Answer ready" : "Review the answer before saving it"}</h2>
                </div>
                <span className={`state-pill ${run?.status === "requires_approval" ? "waiting" : run ? "done" : ""}`}>
                  {status}
                </span>
              </div>

              {!run ? (
                <div className="empty-state">
                  <div className="empty-glyph">
                    <ClipboardCheck size={20} />
                  </div>
                  <p>Your researched answer will appear here first, so you can approve it or ask for changes.</p>
                </div>
              ) : run.status === "requires_approval" ? (
                <div className="approval-flow">
                  <div className="approval-copy">
                    <p>Review the draft below. Approve it, or reject it with notes for revision.</p>
                    <span>{run.approval.question}</span>
                  </div>
                  <pre>{run.approval.draftOutput}</pre>
                  <textarea
                    className="feedback-box"
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    placeholder="Optional feedback for rejection..."
                  />
                  <div className="approval-actions">
                    <button className="secondary-button" disabled={isLoading} onClick={() => resumeRun(false)} type="button">
                      <X size={16} />
                      Reject
                    </button>
                    <button className="run-button" disabled={isLoading} onClick={() => resumeRun(true)} type="button">
                      <Check size={16} />
                      Approve
                    </button>
                  </div>
                </div>
              ) : (
                <div className="final-output">
                  <pre>{run.result.generatedOutput}</pre>
                </div>
              )}
            </section>
          </section>

          <aside className="summary-panel" id="state">
            <div className="inspector-header">
              <Compass size={18} />
              <span>Trip brief</span>
            </div>

            <dl className="state-grid">
              <div>
                <dt>Status</dt>
                <dd>{planStage}</dd>
              </div>
              <div>
                <dt>Focus</dt>
                <dd>{selectedAgent ?? "auto"}</dd>
              </div>
              <div>
                <dt>Review</dt>
                <dd>{approvalLabel}</dd>
              </div>
              <div>
                <dt>Request check</dt>
                <dd>{requestCheck}</dd>
              </div>
            </dl>

            <div className="progress-card">
              <div className={run ? "complete" : "active"}>
                <span />
                <p>Describe the trip</p>
              </div>
              <div className={run?.status === "requires_approval" ? "active" : run ? "complete" : ""}>
                <span />
                <p>Review the draft</p>
              </div>
              <div className={run?.status === "completed" ? "complete active" : ""}>
                <span />
                <p>Use the final answer</p>
              </div>
            </div>

            <div className="output-glance">
              <div>
                <ClipboardCheck size={15} />
                <span>{run ? "Current answer" : "What Wandr can do"}</span>
              </div>
              <p>{outputText || "Research timing, compare destinations, check weather tradeoffs, and turn findings into a reviewed travel plan."}</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
