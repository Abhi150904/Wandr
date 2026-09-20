# Wandr AI

Wandr AI is a production-style travel research agent built with TypeScript, LangGraph.js, MCP, Express, Next.js, Clerk, Postgres, Gemini, Tavily, and OpenWeather.

It turns natural-language travel questions into reviewed, source-backed planning drafts. The project is inspired by a Python LangGraph multi-agent architecture, but it is rebuilt from scratch as an independent TypeScript application with a modern full-stack shape.

## What It Does

Wandr AI routes each request through a small agent workflow:

- **Planner** creates practical trip plans and itineraries.
- **Researcher** answers destination, timing, and comparison questions with Tavily-backed sources.
- **Weather** uses an MCP weather path to provide weather-aware travel guidance.
- **Guardrail** blocks unsupported or unsafe requests before they reach the agents.
- **Human review** pauses every answer for approval or revision before it is finalized.

The result is not just a chatbot response. It is a traceable workflow with routing, typed state, approval gates, saved history, citations, and graceful fallback behavior when model or tool providers are unavailable.

## Why This Project Exists

Most AI portfolio projects stop at a single prompt call. Wandr AI is built to show the harder parts of real agentic software:

- graph-based orchestration instead of linear request handling
- typed state shared across multiple agents
- tool-backed answers instead of model-only claims
- source persistence from draft to final answer
- human-in-the-loop approval before saving
- auth-aware saved history
- degraded-mode behavior for API quota failures
- a product UI designed for actual use, not a generic landing page

## Tech Stack

**Core agent system**

- TypeScript
- Node.js
- LangGraph.js via `@langchain/langgraph`
- LangChain core via `@langchain/core`
- Gemini via `@langchain/google-genai`
- Zod for validation

**Tools and protocols**

- Model Context Protocol TypeScript SDK
- Tavily web search
- OpenWeather-backed weather tooling

**Backend**

- Express
- Clerk auth middleware
- Postgres persistence
- LangGraph Postgres checkpointer
- Vitest and Supertest

**Frontend**

- Next.js
- React
- Clerk auth
- Lucide icons
- Custom dark/light UI

## Architecture

```text
User request
  |
  v
Input guardrail
  |
  v
Deterministic supervisor router
  |
  +--> Planner agent
  |
  +--> Researcher agent -- Tavily search
  |
  +--> Weather agent ---- MCP weather client/server ---- OpenWeather
  |
  v
Human approval interrupt
  |
  v
Final response
  |
  v
Saved run history + sources
```

The graph is intentionally modular. Agents own their own behavior, tools stay separate from graph control flow, and shared state is strongly typed.

## Key Features

- **Multi-agent LangGraph workflow** with guardrail, router, specialist agents, approval, and finalization nodes.
- **Human-in-the-loop review** using LangGraph interrupts and resume flow.
- **MCP weather integration** with a local MCP server path and weather agent.
- **Web research with citations** through Tavily, including source persistence in API responses and saved history.
- **Postgres checkpointing and run history** for durable graph state and user-facing saved runs.
- **Clerk authentication** across Express and Next.js.
- **Production-style API layer** with health/readiness endpoints, typed request schemas, CORS, and tests.
- **Modern app UI** focused on travel research workflows rather than marketing content.
- **Graceful fallbacks** for missing keys, Gemini quota exhaustion, search failures, and weather tool failures.

## Local Setup

Install root dependencies:

```bash
npm install
```

Install web dependencies:

```bash
npm --prefix web install
```

Create your local environment files manually. The project intentionally does not include `.env.example`.

Root `.env` variables:

```bash
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
TAVILY_API_KEY=
OPENWEATHER_API_KEY=
DATABASE_URL=
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
WEB_ORIGIN=http://localhost:3001
```

Web `web/.env.local` variables:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3000
```

## Running Locally

Start the API:

```bash
npm run api:dev
```

Start the web app:

```bash
npm run web:dev
```

Open:

```text
http://localhost:3001
```

You can also run the graph from the terminal:

```bash
npm run dev -- "Plan a weekend trip to Jaipur from Delhi"
npm run dev -- "Find the best time to visit Japan"
npm run dev -- "What weather should I prepare for in Chicago?"
```

## Useful Scripts

```bash
npm run typecheck      # Type-check backend/source files
npm test               # Run backend tests
npm run build          # Build backend TypeScript
npm run web:typecheck  # Type-check Next.js app
npm run web:build      # Build Next.js app
npm run validate       # Run full validation pipeline
```

## API Surface

```text
GET  /health
GET  /ready
GET  /api/runs
GET  /api/runs/:threadId
POST /api/runs
POST /api/runs/:threadId/resume
```

The protected run endpoints require Clerk auth. The readiness endpoint reports whether required production dependencies are configured.

## Project Structure

```text
src/
  agents/        LangGraph node behavior for planner, researcher, weather, approval, final
  api/           Express app, auth, schemas, run history, readiness
  config/        Environment and LLM configuration
  graph/         Graph state, routes, runner, checkpointer, shared types
  guardrails/    Input validation and blocked response path
  mcp/           MCP client and weather server
  tools/         Weather and web search tools

web/
  app/           Next.js application UI
```

## Testing Notes

Gemini free-tier quota can be exhausted quickly during local testing. Wandr AI is designed to keep working in degraded mode:

- Tavily can still provide research sources.
- OpenWeather/MCP can still provide weather data.
- Deterministic fallbacks keep graph execution testable.
- Approval and saved-history flows remain usable.

For AI answer quality testing, use fresh Gemini quota. For product flow testing, degraded mode is enough.

## Status

This is a portfolio-grade local application, not a hosted public product. The architecture is ready for deployment work, but the current focus is demonstrating a clean, typed, multi-agent TypeScript system with real tools, persistence, auth, and a polished research workflow.
