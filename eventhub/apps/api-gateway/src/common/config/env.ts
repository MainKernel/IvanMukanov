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
  // ЛР №5: параметри підпису access-токена та тривалості сесії.
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET: щонайменше 32 символи"),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(1).default(900),
  REFRESH_TTL_DAYS: z.coerce.number().int().min(1).default(30),
  // ЛР №6: параметри OpenID Connect для входу через Google.
  // Якщо порожні — застосунок стартує і при спробі входу через Google
  // коректно повідомляє, що провайдер не налаштовано.
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_REDIRECT_URI: z
    .string()
    .default("http://localhost:5173/api/auth/google/callback"),
});

export type Env = z.infer<typeof envSchema>;
export const env: Env = envSchema.parse(process.env);
