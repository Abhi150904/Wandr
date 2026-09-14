import { AIMessage } from "@langchain/core/messages";

import { invokeGeminiText } from "../config/llm.js";
import type { AgentState, AgentStateUpdate } from "../graph/state.js";
import { getWeatherFromMcp } from "../mcp/client.js";
import type { WeatherReport } from "../tools/weather.tool.js";

const fallbackWeatherGuidance = (userQuery: string): string =>
  [
    `Weather guidance for: ${userQuery}`,
    "1. Treat this as non-live weather guidance until MCP weather tools are added.",
    "2. Identify the destination, season, and travel dates if the user supplied them.",
    "3. Suggest weather-aware planning considerations such as layers, rain plans, and forecast checks.",
    "4. Recommend verifying live conditions before booking or departure."
  ].join("\n");

const extractCity = (userQuery: string): string => {
  const matches = [...userQuery.matchAll(/\b(?:in|for|to)\s+([a-zA-Z\s]+?)(?:[?.!,]|$)/gi)];
  const city = matches
    .at(-1)?.[1]
    ?.replace(/^(?:in|for|to)\s+/i, "")
    .trim();

  return city && city.length > 0 ? city : "the destination";
};

const formatWeatherReport = (weather: WeatherReport, userQuery: string): string =>
  [
    `MCP weather for ${weather.city}`,
    `Request: ${userQuery}`,
    `Condition: ${weather.condition}`,
    `Temperature: ${weather.temperatureC}C`,
    `Humidity: ${weather.humidityPercent}%`,
    `Wind: ${weather.windKph} kph`,
    "Packing advice:",
    ...weather.packingAdvice.map((item) => `- ${item}`),
    `Source: ${weather.source}`
  ].join("\n");

export const weatherAgent = async (state: AgentState): Promise<AgentStateUpdate> => {
  try {
    const city = extractCity(state.userQuery);
    const weather = await getWeatherFromMcp(city);
    const mcpWeatherOutput = formatWeatherReport(weather, state.userQuery);

    try {
      const generatedOutput =
        (await invokeGeminiText(
          [
            "You are a weather-aware travel planning agent.",
            "Use the provided MCP weather report as the weather source.",
            "Do not invent live forecast data."
          ].join("\n"),
          `${mcpWeatherOutput}\n\nUser request:\n${state.userQuery}`
        )) ?? mcpWeatherOutput;

      return {
        generatedOutput,
        draftOutput: generatedOutput,
        weatherOutput: generatedOutput,
        messages: [new AIMessage(generatedOutput)]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Gemini weather response error";

      return {
        error: message,
        generatedOutput: mcpWeatherOutput,
        draftOutput: mcpWeatherOutput,
        weatherOutput: mcpWeatherOutput,
        messages: [new AIMessage(`Weather MCP output used after Gemini error: ${message}`)]
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown weather agent error";
    const generatedOutput = fallbackWeatherGuidance(state.userQuery);

    return {
      error: message,
      generatedOutput,
      draftOutput: generatedOutput,
      weatherOutput: generatedOutput,
      messages: [new AIMessage(`Weather fallback used after error: ${message}`)]
    };
  }
};
