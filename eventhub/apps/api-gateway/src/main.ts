import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { ZodValidationPipe } from "./common/validation/zod-validation.pipe";
import { env } from "./common/config/env";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(Logger);
  app.useLogger(logger);

  // Дозволяємо запити з dev-сервера Vite.
  // У тижні 14 це значення прийде з оточення продакшн-сервера.
  app.enableCors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  });

  app.enableShutdownHooks();
  app.useGlobalPipes(new ZodValidationPipe());

  await app.listen(env.PORT);

  logger.log(`api-gateway слухає http://localhost:${env.PORT}`, "Bootstrap");
}

void bootstrap();
