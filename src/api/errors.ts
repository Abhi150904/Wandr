import { z } from "zod";

export type ApiErrorBody = {
  success: false;
  error: {
    message: string;
    details?: unknown;
  };
};

export const validationError = (error: z.ZodError): ApiErrorBody => ({
  success: false,
  error: {
    message: "Validation failed.",
    details: z.treeifyError(error)
  }
});

export const unknownError = (error: unknown): ApiErrorBody => ({
  success: false,
  error: {
    message: error instanceof Error ? error.message : "Unknown API error"
  }
});
