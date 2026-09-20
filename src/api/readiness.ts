import {
  hasClerkAuthKeys,
  hasDatabaseUrl,
  hasGeminiApiKey,
  hasOpenWeatherApiKey,
  hasTavilyApiKey,
  hasWebOrigin
} from "../config/env.js";

type DependencyStatus = "configured" | "missing";

export type ReadinessBody = {
  status: "ready" | "degraded";
  dependencies: {
    database: DependencyStatus;
    clerk: DependencyStatus;
    gemini: DependencyStatus;
    tavily: DependencyStatus;
    openWeather: DependencyStatus;
    webOrigin: DependencyStatus;
  };
  notes: string[];
};

const status = (configured: boolean): DependencyStatus =>
  configured ? "configured" : "missing";

export const getReadiness = (): ReadinessBody => {
  const dependencies = {
    database: status(hasDatabaseUrl),
    clerk: status(hasClerkAuthKeys),
    gemini: status(hasGeminiApiKey),
    tavily: status(hasTavilyApiKey),
    openWeather: status(hasOpenWeatherApiKey),
    webOrigin: status(hasWebOrigin)
  };

  const missingRequired = [
    dependencies.database === "missing" ? "DATABASE_URL" : undefined,
    dependencies.clerk === "missing" ? "CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY" : undefined,
    dependencies.gemini === "missing" ? "GEMINI_API_KEY" : undefined,
    dependencies.tavily === "missing" ? "TAVILY_API_KEY" : undefined,
    dependencies.webOrigin === "missing" ? "WEB_ORIGIN" : undefined
  ].filter((value): value is string => Boolean(value));

  return {
    status: missingRequired.length === 0 ? "ready" : "degraded",
    dependencies,
    notes:
      missingRequired.length > 0
        ? [`Missing production configuration: ${missingRequired.join(", ")}.`]
        : ["All required production dependencies are configured."]
  };
};
