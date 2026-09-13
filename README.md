# TypeScript LangGraph Agent Scaffold

An independent TypeScript/LangGraph.js portfolio project inspired by the architecture of the original Python multi-agent project, rebuilt from scratch for Node.js.

## Current Scope

Implemented:

- Strict TypeScript project scaffold
- LangGraph.js graph with input guardrails and supervisor routing to `planner`, `researcher`, or `weather`
- Strongly typed graph state with messages, guardrail metadata, routing metadata, specialist outputs, generated output, and error handling
- Supervisor-routed agents runnable from the terminal
- Mock deterministic weather tool exposed through a local MCP stdio server
- Weather agent integration with the MCP client/server path
- Zod-based environment validation
- Deterministic fallback when `GEMINI_API_KEY` is not set
- Optional Gemini support through `ChatGoogleGenerativeAI` when `GEMINI_API_KEY` is available

Intentionally not implemented yet:

- Human-in-the-loop flows
- Persistence
- API layer
- Frontend
- Real OpenWeather API integration

## Getting Started

```bash
npm install
npm run typecheck
npm run dev
```

Add required variables to your local `.env` file when you want live Gemini calls.

Run with a custom prompt:

```bash
npm run dev -- "Plan a research workflow for weather-aware travel."
npm run dev -- "What weather should I prepare for in London?"
```

Without an API key, the graph returns deterministic local responses. With `GEMINI_API_KEY` set, guardrail, supervisor, and specialist agents can use Gemini through LangChain.js. The weather agent calls a local mock MCP weather server before producing its response.

Run the weather MCP server directly:

```bash
npm run mcp:weather
```

## Environment

```bash
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.8-flash
```

## Project Structure

```text
src/
  agents/
    planner.agent.ts
    researcher.agent.ts
    supervisor.agent.ts
    weather.agent.ts
  config/
    env.ts
    llm.ts
  graph/
    graph.ts
    routes.ts
    state.ts
    types.ts
  guardrails/
    input.guardrail.ts
  mcp/
    client.ts
    servers/
      weather.server.ts
  tools/
    weather.tool.ts
  index.ts
```

## Git Procedure

Use this pull request flow from your side:

```bash
git checkout main
git pull origin main
git checkout -b phase-4-mcp-weather-tool

# code changes

npm install
npm run typecheck
npm run dev
git status
git add .
git commit -m "Add mock MCP weather tool integration"
git push -u origin phase-4-mcp-weather-tool
```

After the GitHub PR is merged:

```bash
git checkout main
git pull origin main
```

After merging each phase, return to `main` and sync before starting the next branch.
