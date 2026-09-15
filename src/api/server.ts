import { createApp } from "./app.js";

const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const HOST = process.env.HOST ?? "127.0.0.1";

const app = createApp();
const server = app.listen(PORT, HOST, () => {
  console.log(`API server listening at http://${HOST}:${PORT}`);
});

const shutdown = (signal: NodeJS.Signals): void => {
  console.log(`Received ${signal}; shutting down API server.`);

  server.close((error) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }

    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
