import { MemorySaver, type BaseCheckpointSaver } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

import { env } from "../config/env.js";

export type CheckpointerInfo = {
  checkpointer: BaseCheckpointSaver;
  kind: "memory" | "postgres";
};

const normalizePostgresUrl = (databaseUrl: string): string => {
  const url = new URL(databaseUrl);

  if (url.searchParams.get("sslmode") === "require" && !url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
  }

  return url.toString();
};

export const createCheckpointer = async (): Promise<CheckpointerInfo> => {
  if (!env.DATABASE_URL) {
    return {
      checkpointer: new MemorySaver(),
      kind: "memory"
    };
  }

  const postgresCheckpointer = PostgresSaver.fromConnString(
    normalizePostgresUrl(env.DATABASE_URL)
  );
  await postgresCheckpointer.setup();

  return {
    checkpointer: postgresCheckpointer,
    kind: "postgres"
  };
};
