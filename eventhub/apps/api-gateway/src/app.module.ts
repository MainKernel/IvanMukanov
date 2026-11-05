import { randomUUID } from "node:crypto";
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Module,
} from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { InjectPinoLogger, LoggerModule, PinoLogger } from "nestjs-pino";
import type { Request, Response } from "express";
import { HealthModule } from "./health/health.module";
import { CatalogModule } from "./catalog/catalog.module";
import { OrdersModule } from "./orders/orders.module";
import { FavoritesModule } from "./favorites/favorites.module";
import { AuthModule } from "./auth/auth.module";
import { OrganizerModule } from "./organizer/organizer.module";
import { AdminModule } from "./admin/admin.module";
import { PrismaModule } from "./prisma/prisma.module";
import { toProblem } from "./common/problem/problem";
import { env } from "./common/config/env";

@Catch()
export class ProblemFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(ProblemFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(err: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const problem = toProblem(err);

    if (problem.status >= 500) {
      this.logger.error({ err, url: req.url }, "unhandled error");
    } else {
      this.logger.debug(
        { type: problem.type, url: req.url },
        "request rejected",
      );
    }

    ctx
      .getResponse<Response>()
      .status(problem.status)
      .type("application/problem+json")
      .json({ ...problem, instance: req.originalUrl });
  }
}

/**
 * Кореневий модуль застосунку.
 *
 * У тижні 2 сюди додадуться CatalogModule і спільні провайдери
 * (валідація конфігурації, логер, фільтр помилок).
 */
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL,
        genReqId: (req, res) => {
          const incoming = req.headers["x-request-id"];
          const id =
            typeof incoming === "string" && incoming ? incoming : randomUUID();
          res.setHeader("x-request-id", id);
          return id;
        },
        redact: [
          "req.headers.authorization",
          "req.headers.cookie",
          "res.headers['set-cookie']",
        ],
        transport:
          env.NODE_ENV === "development"
            ? { target: "pino-pretty", options: { singleLine: true } }
            : undefined,
      },
    }),
    HealthModule,
    CatalogModule,
    OrdersModule,
    FavoritesModule,
    AuthModule,
    OrganizerModule,
    AdminModule,
    PrismaModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: ProblemFilter }],
})
export class AppModule {}
