import type { CorsOptions } from "cors";

import { env } from "../config/env.js";

const devOrigins = new Set([
  "http://localhost:3001",
  "http://127.0.0.1:3001"
]);

const configuredOrigins = new Set(
  (env.WEB_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const allowedOrigins = new Set([...devOrigins, ...configuredOrigins]);

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS origin not allowed: ${origin}`));
  }
};
