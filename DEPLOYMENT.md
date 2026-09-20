# Deployment

Wandr AI runs as two deployable apps:

- API: Express, LangGraph.js, Clerk auth, Neon/Postgres checkpointing and run history.
- Web: Next.js frontend served separately from the API.

Recommended deployment:

- API: Render, Railway, or Fly.io.
- Web: Vercel.
- Database: Neon Postgres.

## API Environment

Set these variables on the API service:

```text
GEMINI_API_KEY
GEMINI_MODEL
TAVILY_API_KEY
OPENWEATHER_API_KEY
DATABASE_URL
CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
WEB_ORIGIN
PORT
HOST
```

Notes:

- `GEMINI_MODEL` defaults to `gemini-3.8-flash` if omitted.
- `TAVILY_API_KEY` powers web research. Keep it server-side only.
- `OPENWEATHER_API_KEY` is optional for local fallback behavior, but should be set in production.
- `WEB_ORIGIN` should be the deployed web URL, for example `https://your-app.vercel.app`.
- For multiple allowed web origins, separate them with commas.
- Keep `HOST` unset unless the platform requires it. Most platforms provide their own host binding.

## Web Environment

Set these variables on the web service:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
NEXT_PUBLIC_API_BASE_URL
```

Notes:

- `NEXT_PUBLIC_API_BASE_URL` should point to the deployed API URL.
- Use Clerk production keys for a public deployment.

## API Commands

Install:

```bash
npm install
```

Build:

```bash
npm run build
```

Start:

```bash
npm start
```

Validate locally before deploying:

```bash
npm run validate
```

## Web Commands

Install:

```bash
npm --prefix web install
```

Build:

```bash
npm run web:build
```

Start:

```bash
npm --prefix web run start
```

## Health Checks

Liveness:

```text
GET /health
```

Readiness:

```text
GET /ready
```

`/ready` reports which dependencies are configured without returning secret values.

## Deployment Order

1. Create or reuse the Neon database.
2. Deploy the API with all API environment variables.
3. Check `GET /ready`.
4. Deploy the web app with the API URL and Clerk publishable key.
5. Add the final web domain to API `WEB_ORIGIN`.
6. Test sign-in, run creation, approval, and saved history.
