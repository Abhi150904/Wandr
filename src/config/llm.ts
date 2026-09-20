import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { env } from "./env.js";

const GEMINI_TIMEOUT_MS = 30_000;

const withTimeout = async <T>(
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> => {
  const controller = new AbortController();
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      task(controller.signal),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error(`Gemini request timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

export const invokeGeminiText = async (
  systemPrompt: string,
  userPrompt: string
): Promise<string | undefined> => {
  const geminiApiKey = env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    return undefined;
  }

  const model = new ChatGoogleGenerativeAI({
    apiKey: geminiApiKey,
    model: env.GEMINI_MODEL,
    temperature: 0,
    maxRetries: 2
  });

  const response = await withTimeout(
    (signal) =>
      model.invoke(
        [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        { signal }
      ),
    GEMINI_TIMEOUT_MS
  );

  return typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content);
};
