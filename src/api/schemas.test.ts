import { describe, expect, it } from "vitest";

import { resumeRunRequestSchema, startRunRequestSchema } from "./schemas.js";

describe("api schemas", () => {
  it("accepts a valid start run request", () => {
    expect(startRunRequestSchema.safeParse({ message: "Plan a trip" }).success).toBe(true);
  });

  it("rejects an empty start run message", () => {
    expect(startRunRequestSchema.safeParse({ message: "" }).success).toBe(false);
  });

  it("accepts approve and reject resume payloads", () => {
    expect(resumeRunRequestSchema.safeParse({ approved: true }).success).toBe(true);
    expect(resumeRunRequestSchema.safeParse({ approved: false, feedback: "Revise it" }).success).toBe(true);
  });

  it("rejects resume payload without approved boolean", () => {
    expect(resumeRunRequestSchema.safeParse({ feedback: "Revise it" }).success).toBe(false);
  });
});
