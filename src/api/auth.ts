import { clerkMiddleware, getAuth } from "@clerk/express";
import type { NextFunction, Request, RequestHandler, Response } from "express";

import { env, hasClerkAuthKeys } from "../config/env.js";

export type AuthedResponseLocals = {
  userId: string;
};

const createAuthMiddleware = (): RequestHandler => {
  const publishableKey = env.CLERK_PUBLISHABLE_KEY;
  const secretKey = env.CLERK_SECRET_KEY;

  if (!publishableKey || !secretKey) {
    return (_request, _response, next) => {
      next();
    };
  }

  return clerkMiddleware({
    publishableKey,
    secretKey
  });
};

export const attachAuth: RequestHandler = createAuthMiddleware();

export const requireUser = (
  request: Request,
  response: Response<unknown, AuthedResponseLocals>,
  next: NextFunction
) => {
  if (!hasClerkAuthKeys) {
    response.locals.userId = "local-dev-user";
    next();
    return;
  }

  const auth = getAuth(request);

  if (!auth.userId) {
    response.status(401).json({
      success: false,
      error: {
        message: "Authentication required."
      }
    });
    return;
  }

  response.locals.userId = auth.userId;
  next();
};
