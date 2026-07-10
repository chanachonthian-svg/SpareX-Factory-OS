import { config } from "./config.js";
import { buildServer } from "./http/server.js";

const app = buildServer();

app.listen({ port: config.port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
