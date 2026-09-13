import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { weatherReportSchema, type WeatherReport } from "../tools/weather.tool.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, "../..");
const tsxCliPath = resolve(projectRoot, "node_modules/tsx/dist/cli.mjs");
const weatherServerPath = resolve(projectRoot, "src/mcp/servers/weather.server.ts");

export const getWeatherFromMcp = async (city: string): Promise<WeatherReport> => {
  const client = new Client({
    name: "wandr-ai-weather-client",
    version: "0.1.0"
  });

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [tsxCliPath, weatherServerPath],
    cwd: projectRoot,
    stderr: "pipe"
  });

  try {
    await client.connect(transport);

    const result = await client.callTool({
      name: "get_current_weather",
      arguments: { city }
    });

    return weatherReportSchema.parse(result.structuredContent);
  } finally {
    await client.close();
  }
};
