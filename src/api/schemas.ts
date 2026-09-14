import { z } from "zod";

export const startRunRequestSchema = z.object({
  message: z.string().trim().min(1, "message is required"),
  threadId: z.string().trim().min(1).optional()
});

export const resumeRunRequestSchema = z.object({
  approved: z.boolean(),
  feedback: z.string().optional()
});

export type StartRunRequest = z.infer<typeof startRunRequestSchema>;
export type ResumeRunRequest = z.infer<typeof resumeRunRequestSchema>;
