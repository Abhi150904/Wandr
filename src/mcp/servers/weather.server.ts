import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { getMockWeather, weatherReportSchema } from "../../tools/weather.tool.js";

const server = new McpServer({
  name: "mock-weather-mcp-server",
  version: "0.1.0"
});

server.registerTool(
  "get_mock_weather",
  {
    title: "Get Mock Weather",
    description: "Return deterministic mock weather for a city.",
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
      source: z.literal("mock-mcp-weather")
    }
  },
  async ({ city }) => {
    const weather = getMockWeather({ city });

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
