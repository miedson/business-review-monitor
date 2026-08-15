import "dotenv/config";
import { loadConfig } from "@brm/config";
import { buildApi } from "./server/app.js";

const config = loadConfig();
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 3333);

const app = await buildApi({ config });

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
