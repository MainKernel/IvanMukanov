import "reflect-metadata";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import { parse as parseYaml } from "yaml";
import { AppModule } from "./app.module";
import { ZodValidationPipe } from "./common/validation/zod-validation.pipe";
import { env } from "./common/config/env";

function loadOpenApiSpec(): OpenAPIObject {
  const specPath = resolve(
    __dirname,
    "../../../packages/contracts/openapi.yaml",
  );
  const raw = readFileSync(specPath, "utf8");
  return parseYaml(raw) as OpenAPIObject;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(Logger);
  app.useLogger(logger);

  app.use(cookieParser());

  // Дозволяємо запити з dev-сервера Vite.
  // У тижні 14 це значення прийде з оточення продакшн-сервера.
  app.enableCors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  });

  app.enableShutdownHooks();
  app.useGlobalPipes(new ZodValidationPipe());

  // Підключаємо інтерактивний Swagger UI напряму з єдиного джерела правди —
  // контракту packages/contracts/openapi.yaml (Contract-First).
  const openApiDoc = loadOpenApiSpec();
  SwaggerModule.setup("docs", app, openApiDoc, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
    customSiteTitle: "EventHub API — Swagger UI",
  });

  await app.listen(env.PORT);

  logger.log(`api-gateway слухає http://localhost:${env.PORT}`, "Bootstrap");
  logger.log(
    `Swagger UI доступний на http://localhost:${env.PORT}/docs`,
    "Bootstrap",
  );
}

void bootstrap();
