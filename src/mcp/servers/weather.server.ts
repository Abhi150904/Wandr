import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { env } from "../../config/env.js";
import {
  buildPackingAdvice,
  getMockWeather,
  weatherReportSchema,
  weatherToolInputSchema,
  type WeatherReport
} from "../../tools/weather.tool.js";

const openWeatherResponseSchema = z.object({
  name: z.string(),
  main: z.object({
    temp: z.number(),
    humidity: z.number().int().min(0).max(100)
  }),
  weather: z.array(
    z.object({
      description: z.string()
    })
  ).min(1),
  wind: z.object({
    speed: z.number()
  })
});

const server = new McpServer({
  name: "weather-mcp-server",
  version: "0.1.0"
});

const getOpenWeather = async (city: string): Promise<WeatherReport | undefined> => {
  if (!env.OPENWEATHER_API_KEY) {
    return undefined;
  }

  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("q", city);
  url.searchParams.set("appid", env.OPENWEATHER_API_KEY);
  url.searchParams.set("units", "metric");

  const response = await fetch(url, {
    signal: AbortSignal.timeout(10_000)
  });

  if (!response.ok) {
    throw new Error(`OpenWeather request failed with status ${response.status}.`);
  }

  const payload = openWeatherResponseSchema.parse(await response.json());
  const condition = payload.weather[0]?.description ?? "unknown conditions";
  const temperatureC = Math.round(payload.main.temp * 10) / 10;

  return weatherReportSchema.parse({
    city: payload.name,
    condition,
    temperatureC,
    humidityPercent: payload.main.humidity,
    windKph: Math.round(payload.wind.speed * 3.6 * 10) / 10,
    packingAdvice: buildPackingAdvice(temperatureC, condition),
    source: "openweather"
  });
};

const getWeather = async (city: string): Promise<WeatherReport> => {
  const parsedInput = weatherToolInputSchema.parse({ city });

  try {
    return (await getOpenWeather(parsedInput.city)) ?? getMockWeather(parsedInput);
  } catch {
    return getMockWeather(parsedInput);
  }
};

server.registerTool(
  "get_current_weather",
  {
    title: "Get Current Weather",
    description: "Return current weather for a city using OpenWeather, with deterministic mock fallback.",
    inputSchema: {
      city: z.string().trim().min(1).describe("City name")
    },
    outputSchema: {
      city: z.string(),
      condition: z.string(),
      temperatureC: z.number(),
      humidityPercent: z.number().int().min(0).max(100),
      windKph: z.number(),
      packingAdvice: z.array(z.string()),
      source: z.enum(["openweather", "mock-mcp-weather"])
    }
  },
  async ({ city }) => {
    const weather = await getWeather(city);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(weather, null, 2)
        }
      ],
      structuredContent: weatherReportSchema.parse(weather)
    };
  }
);

const main = async (): Promise<void> => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown weather MCP server error";
  console.error(message);
  process.exit(1);
});
