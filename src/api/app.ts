import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { resumeRun, startRun } from "../graph/runner.js";
import { unknownError, validationError } from "./errors.js";
import { resumeRunRequestSchema, startRunRequestSchema } from "./schemas.js";

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      features: [
        "langgraph",
        "supervisor",
        "guardrails",
        "mcp_weather",
        "postgres_checkpointing",
        "hitl_resume"
      ]
    });
  });

  app.post("/api/runs", async (request: Request, response: Response, next: NextFunction) => {
    try {
      const parsed = startRunRequestSchema.safeParse(request.body);

      if (!parsed.success) {
        response.status(400).json(validationError(parsed.error));
        return;
      }

      const threadId = parsed.data.threadId ?? `thread_${randomUUID()}`;
      const result = await startRun(parsed.data.message, threadId);

      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/runs/:threadId/resume",
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const paramsSchema = z.object({
          threadId: z.string().trim().min(1)
        });
        const parsedParams = paramsSchema.safeParse(request.params);
        const parsedBody = resumeRunRequestSchema.safeParse(request.body);

        if (!parsedParams.success) {
          response.status(400).json(validationError(parsedParams.error));
          return;
        }

        if (!parsedBody.success) {
          response.status(400).json(validationError(parsedBody.error));
          return;
        }

        const result = await resumeRun(parsedParams.data.threadId, parsedBody.data);

        response.json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    response.status(500).json(unknownError(error));
  });

  return app;
};
