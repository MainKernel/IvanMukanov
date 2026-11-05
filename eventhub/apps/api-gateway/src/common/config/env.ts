import { z } from "zod";
import { config as loadDotenv } from "dotenv";
loadDotenv();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("debug"),
  PRISMA_LOG: z.enum(["query", "off"]).default("off"),
  // ДЗ ЛР №4: примусово відповідати 503 на зміну обраного, щоб перевірити
  // відкат оптимістичного оновлення на фронтенді.
  FAVORITES_FAIL: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export type Env = z.infer<typeof envSchema>;
export const env: Env = envSchema.parse(process.env);
