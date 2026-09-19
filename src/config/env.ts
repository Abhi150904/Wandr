import "dotenv/config";
import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional()
);

const envSchema = z.object({
  GEMINI_API_KEY: optionalString,
  GEMINI_MODEL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().min(1).default("gemini-3.8-flash")
  ),
  OPENWEATHER_API_KEY: optionalString,
  DATABASE_URL: optionalString,
  CLERK_PUBLISHABLE_KEY: optionalString,
  CLERK_SECRET_KEY: optionalString
});

export const env = envSchema.parse(process.env);

export const hasGeminiApiKey = Boolean(env.GEMINI_API_KEY);
export const hasOpenWeatherApiKey = Boolean(env.OPENWEATHER_API_KEY);
export const hasDatabaseUrl = Boolean(env.DATABASE_URL);
export const hasClerkAuthKeys = Boolean(env.CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY);
