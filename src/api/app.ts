import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { resumeRun, startRun } from "../graph/runner.js";
import { attachAuth, requireUser, type AuthedResponseLocals } from "./auth.js";
import { corsOptions } from "./cors.js";
import { unknownError, validationError } from "./errors.js";
import { getReadiness } from "./readiness.js";
import {
  getRunHistory,
  listRunHistory,
  type RunHistoryMode,
  saveRunHistory
} from "./run-history.js";
import { resumeRunRequestSchema, startRunRequestSchema } from "./schemas.js";

export const createApp = () => {
  const app = express();

  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(attachAuth);

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

  app.get("/ready", (_request, response) => {
    const readiness = getReadiness();
    response.status(readiness.status === "ready" ? 200 : 503).json(readiness);
  });

  app.get(
    "/api/runs",
    requireUser,
    async (_request: Request, response: Response<unknown, AuthedResponseLocals>, next: NextFunction) => {
      try {
        const runs = await listRunHistory(response.locals.userId);

        response.json({
          success: true,
          runs
        });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    "/api/runs/:threadId",
    requireUser,
    async (request: Request, response: Response<unknown, AuthedResponseLocals>, next: NextFunction) => {
      try {
        const paramsSchema = z.object({
          threadId: z.string().trim().min(1)
        });
        const parsedParams = paramsSchema.safeParse(request.params);

        if (!parsedParams.success) {
          response.status(400).json(validationError(parsedParams.error));
          return;
        }

        const run = await getRunHistory(response.locals.userId, parsedParams.data.threadId);

        if (!run) {
          response.status(404).json({
            success: false,
            error: {
              message: "Run not found."
            }
          });
          return;
        }

        response.json({
          success: true,
          run
        });
      } catch (error) {
        next(error);
      }
    }
  );

  app.post("/api/runs", requireUser, async (request: Request, response: Response<unknown, AuthedResponseLocals>, next: NextFunction) => {
    try {
      const parsed = startRunRequestSchema.safeParse(request.body);

      if (!parsed.success) {
        response.status(400).json(validationError(parsed.error));
        return;
      }

      const threadId = parsed.data.threadId ?? `thread_${randomUUID()}`;
      const result = await startRun(parsed.data.message, threadId);
      await saveRunHistory({
        threadId,
        userId: response.locals.userId,
        message: parsed.data.message,
        mode: parsed.data.mode,
        status: result.status,
        ...(result.status === "requires_approval" && result.approval?.selectedAgent
          ? { selectedAgent: result.approval.selectedAgent }
          : {}),
        ...(result.status === "completed" && result.result?.selectedAgent
          ? { selectedAgent: result.result.selectedAgent }
          : {}),
        draftOutput: result.approval?.draftOutput ?? "",
        generatedOutput: result.result?.generatedOutput ?? result.approval?.draftOutput ?? "",
        finalOutput: result.result?.finalOutput ?? "",
        sources: result.result?.sources ?? result.approval?.sources ?? [],
        ...(result.approval ? { approval: result.approval } : {})
      });

      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/runs/:threadId/resume",
    requireUser,
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

        const existingRun = await getRunHistory(
          response.locals.userId,
          parsedParams.data.threadId
        );

        if (!existingRun) {
          response.status(404).json({
            success: false,
            error: {
              message: "Run not found."
            }
          });
          return;
        }

        const result = await resumeRun(parsedParams.data.threadId, parsedBody.data);
        await saveRunHistory({
          threadId: parsedParams.data.threadId,
          userId: response.locals.userId,
          message: existingRun.message,
          mode: existingRun.mode as RunHistoryMode,
          status: result.status,
          ...(result.status === "completed" && result.result?.selectedAgent
            ? { selectedAgent: result.result.selectedAgent }
            : {}),
          draftOutput: existingRun.draftOutput,
          generatedOutput: result.result?.generatedOutput ?? existingRun.generatedOutput,
          finalOutput: result.result?.finalOutput ?? existingRun.finalOutput,
          sources: result.result?.sources ?? result.approval?.sources ?? existingRun.sources,
          ...(result.approval ? { approval: result.approval } : {})
        });

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
