import { Pool, type QueryResult } from "pg";

import { env } from "../config/env.js";
import type { AgentName, ApprovalInterruptPayload, ResearchSource } from "../graph/types.js";

export type RunHistoryStatus = "requires_approval" | "completed";
export type RunHistoryMode = "plan" | "weather" | "research";

export type RunHistoryEntry = {
  threadId: string;
  userId: string;
  message: string;
  mode: RunHistoryMode;
  status: RunHistoryStatus;
  selectedAgent?: AgentName;
  draftOutput: string;
  generatedOutput: string;
  finalOutput: string;
  sources: ResearchSource[];
  approval?: ApprovalInterruptPayload;
  createdAt: string;
  updatedAt: string;
};

export type SaveRunHistoryInput = Omit<RunHistoryEntry, "createdAt" | "updatedAt">;

type DbRunHistoryRow = {
  thread_id: string;
  user_id: string;
  message: string;
  mode: RunHistoryMode;
  status: RunHistoryStatus;
  selected_agent: AgentName | null;
  draft_output: string;
  generated_output: string;
  final_output: string;
  sources: ResearchSource[] | null;
  approval_payload: ApprovalInterruptPayload | null;
  created_at: Date;
  updated_at: Date;
};

const normalizePostgresUrl = (databaseUrl: string): string => {
  const url = new URL(databaseUrl);

  if (url.searchParams.get("sslmode") === "require" && !url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
  }

  return url.toString();
};

const memoryHistory = new Map<string, RunHistoryEntry>();
let pool: Pool | undefined;
let hasInitializedTable = false;

const historyKey = (userId: string, threadId: string) => `${userId}:${threadId}`;

const toIso = (value: Date | string) => (value instanceof Date ? value.toISOString() : value);

const toEntry = (row: DbRunHistoryRow): RunHistoryEntry => ({
  threadId: row.thread_id,
  userId: row.user_id,
  message: row.message,
  mode: row.mode,
  status: row.status,
  ...(row.selected_agent ? { selectedAgent: row.selected_agent } : {}),
  draftOutput: row.draft_output,
  generatedOutput: row.generated_output,
  finalOutput: row.final_output,
  sources: row.sources ?? [],
  ...(row.approval_payload ? { approval: row.approval_payload } : {}),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});

const getPool = () => {
  if (!env.DATABASE_URL) return undefined;

  pool ??= new Pool({
    connectionString: normalizePostgresUrl(env.DATABASE_URL)
  });

  return pool;
};

const ensureHistoryTable = async () => {
  const activePool = getPool();

  if (!activePool || hasInitializedTable) return;

  await activePool.query(`
    create table if not exists wandr_run_history (
      thread_id text primary key,
      user_id text not null,
      message text not null,
      mode text not null,
      status text not null,
      selected_agent text,
      draft_output text not null default '',
      generated_output text not null default '',
      final_output text not null default '',
      sources jsonb not null default '[]'::jsonb,
      approval_payload jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await activePool.query(`
    alter table wandr_run_history
      add column if not exists sources jsonb not null default '[]'::jsonb;
  `);

  await activePool.query(`
    create index if not exists wandr_run_history_user_updated_idx
      on wandr_run_history (user_id, updated_at desc);
  `);

  hasInitializedTable = true;
};

export const saveRunHistory = async (input: SaveRunHistoryInput): Promise<RunHistoryEntry> => {
  const activePool = getPool();

  if (!activePool) {
    const now = new Date().toISOString();
    const existing = memoryHistory.get(historyKey(input.userId, input.threadId));
    const entry: RunHistoryEntry = {
      ...input,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    memoryHistory.set(historyKey(input.userId, input.threadId), entry);
    return entry;
  }

  await ensureHistoryTable();

  const result: QueryResult<DbRunHistoryRow> = await activePool.query(
    `
      insert into wandr_run_history (
        thread_id,
        user_id,
        message,
        mode,
        status,
        selected_agent,
        draft_output,
        generated_output,
        final_output,
        sources,
        approval_payload
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      on conflict (thread_id)
      do update set
        message = excluded.message,
        mode = excluded.mode,
        status = excluded.status,
        selected_agent = excluded.selected_agent,
        draft_output = excluded.draft_output,
        generated_output = excluded.generated_output,
        final_output = excluded.final_output,
        sources = excluded.sources,
        approval_payload = excluded.approval_payload,
        updated_at = now()
      where wandr_run_history.user_id = excluded.user_id
      returning *;
    `,
    [
      input.threadId,
      input.userId,
      input.message,
      input.mode,
      input.status,
      input.selectedAgent ?? null,
      input.draftOutput,
      input.generatedOutput,
      input.finalOutput,
      JSON.stringify(input.sources),
      input.approval ? JSON.stringify(input.approval) : null
    ]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Unable to save run history.");
  }

  return toEntry(row);
};

export const listRunHistory = async (userId: string): Promise<RunHistoryEntry[]> => {
  const activePool = getPool();

  if (!activePool) {
    return Array.from(memoryHistory.values())
      .filter((entry) => entry.userId === userId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  await ensureHistoryTable();

  const result: QueryResult<DbRunHistoryRow> = await activePool.query(
    `
      select *
      from wandr_run_history
      where user_id = $1
      order by updated_at desc
      limit 30;
    `,
    [userId]
  );

  return result.rows.map(toEntry);
};

export const getRunHistory = async (
  userId: string,
  threadId: string
): Promise<RunHistoryEntry | undefined> => {
  const activePool = getPool();

  if (!activePool) {
    return memoryHistory.get(historyKey(userId, threadId));
  }

  await ensureHistoryTable();

  const result: QueryResult<DbRunHistoryRow> = await activePool.query(
    `
      select *
      from wandr_run_history
      where user_id = $1 and thread_id = $2
      limit 1;
    `,
    [userId, threadId]
  );

  const row = result.rows[0];
  return row ? toEntry(row) : undefined;
};
