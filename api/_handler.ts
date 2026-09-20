import { Hono } from "hono";
import { handle } from "hono/vercel";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import hiAnimeRoutes from "../src/routes/routes";
import config from "../src/config/config";
import { AppError } from "../src/utils/errors";
import { fail } from "../src/utils/response";

const app = new Hono();

const origins = config.origin.includes(",")
  ? config.origin.split(",").map((o) => o.trim())
  : config.origin === "*"
    ? "*"
    : [config.origin];

app.use(
  "*",
  cors({
    origin: origins,
    allowMethods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS",
    ],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
    ],
    exposeHeaders: [
      "Content-Length",
      "X-Request-Id",
    ],
    maxAge: 600,
    credentials: true,
  }),
);

if (!config.isProduction || config.enableLogging) {
  app.use("/api/v2/*", logger());
}

app.get("/", (c) => {
  return c.json({
    status: "ok",
    message: "HiAnime API Server",
    timestamp: new Date().toISOString(),
    environment: "vercel",
  });
});

app.get("/ping", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: "vercel",
  });
});

app.route("/api/v2", hiAnimeRoutes);

app.onError((err, c) => {
  if (err instanceof AppError) {
    return fail(
      c,
      err.message,
      err.statusCode,
      err.details,
    );
  }

  console.error(
    "Vercel Unexpected Error:",
    err instanceof Error
      ? err.message
      : String(err),
  );

  return fail(
    c,
    "Internal server error",
    500,
  );
});

app.notFound((c) => {
  return fail(
    c,
    "Route not found",
    404,
  );
});

let handlerExport;

try {
  handlerExport = handle(app);
} catch (initError) {
  console.error(
    "Failed to initialize handler:",
    initError instanceof Error
      ? initError.message
      : String(initError),
  );

  handlerExport = (_req: unknown, res: any) => {
    res.statusCode = 500;
    res.setHeader(
      "Content-Type",
      "application/json",
    );
    res.end(
      JSON.stringify({
        error: "Handler initialization failed",
      }),
    );
  };
}

export default handlerExport;
