import { HttpException } from "@nestjs/common";
import type { Problem } from "@eventhub/contracts";
import {
  AccountExistsWithPassword,
  EmailTaken,
  EventCancelledError,
  EventNotFound,
  FavoritesUnavailable,
  Forbidden,
  ForbiddenOrderAccess,
  GoogleAuthNotConfigured,
  IdempotencyKeyReused,
  InvalidCredentials,
  InvalidCursor,
  InvalidRefreshToken,
  OAuthAccountAlreadyLinked,
  OAuthEmailNotVerified,
  OAuthStateMismatch,
  OrderAlreadyCancelled,
  OrderNotFound,
  OrderStateConflict,
  RequestValidationFailed,
  SeatAlreadyHeld,
  SeatsUnavailable,
  Unauthenticated,
  UserNotFound,
  VenueNotFound,
} from "./domain-errors";

export interface ProblemBody extends Problem {
  errors?: unknown;
  seatIds?: string[];
  current?: string;
}

export function toProblem(err: unknown): ProblemBody {
  if (err instanceof RequestValidationFailed) {
    return {
      type: "/errors/invalid-query",
      title: "Некоректний параметр запиту",
      status: 400,
      detail: err.issues.map((i) => `${i.field}: ${i.message}`).join("; "),
      errors: err.issues,
    };
  }

  if (err instanceof InvalidCursor) {
    return {
      type: "/errors/invalid-cursor",
      title: "Некоректний курсор пагінації",
      status: 400,
      detail: err.message,
    };
  }

  if (err instanceof Forbidden) {
    return {
      type: "/errors/forbidden",
      title: "Недостатньо прав доступу",
      status: 403,
      detail: err.message,
    };
  }

  if (err instanceof ForbiddenOrderAccess) {
    return {
      type: "/errors/forbidden-order-access",
      title: "Доступ до замовлення заборонено",
      status: 403,
      detail: err.message,
    };
  }

  if (err instanceof EventNotFound) {
    return {
      type: "/errors/not-found",
      title: "Подію не знайдено",
      status: 404,
      detail: err.message,
    };
  }

  if (err instanceof OrderNotFound) {
    return {
      type: "/errors/order-not-found",
      title: "Замовлення не знайдено",
      status: 404,
      detail: err.message,
    };
  }

  if (err instanceof SeatsUnavailable) {
    return {
      type: "/errors/seats-unavailable",
      title: "Місця вже зайняті",
      status: 409,
      detail: err.message,
      seatIds: err.seatIds,
    };
  }

  if (err instanceof OrderStateConflict) {
    return {
      type: "/errors/order-state",
      title: "Замовлення вже не очікує оплати",
      status: 409,
      detail: err.message,
      current: err.current,
    };
  }

  if (err instanceof IdempotencyKeyReused) {
    return {
      type: "/errors/idempotency-key-reused",
      title: "Ключ ідемпотентності вже використано з іншим запитом",
      status: 422,
      detail: err.message,
    };
  }

  if (err instanceof UserNotFound) {
    return {
      type: "/errors/user-not-found",
      title: "Користувача не знайдено",
      status: 404,
      detail: err.message,
    };
  }

  if (err instanceof SeatAlreadyHeld) {
    return {
      type: "/errors/seat-already-held",
      title: "Місця вже утримуються іншим покупцем",
      status: 409,
      detail: err.message,
    };
  }

  if (err instanceof OrderAlreadyCancelled) {
    return {
      type: "/errors/order-already-cancelled",
      title: "Замовлення вже скасовано",
      status: 409,
      detail: err.message,
    };
  }

  if (err instanceof EventCancelledError) {
    return {
      type: "/errors/event-cancelled",
      title: "Подію скасовано організатором",
      status: 422,
      detail: err.message,
    };
  }

  if (err instanceof VenueNotFound) {
    return {
      type: "/errors/venue-not-found",
      title: "Майданчик не знайдено",
      status: 422,
      detail: err.message,
    };
  }

  if (err instanceof FavoritesUnavailable) {
    return {
      type: "/errors/favorites-unavailable",
      title: "Не вдалося оновити обране",
      status: 503,
      detail: err.message,
    };
  }

  if (err instanceof GoogleAuthNotConfigured) {
    return {
      type: "/errors/google-not-configured",
      title: "Вхід через Google не налаштовано",
      status: 503,
      detail: err.message,
    };
  }

  if (err instanceof EmailTaken) {
    return {
      type: "/errors/email-taken",
      title: "Ця пошта вже зареєстрована",
      status: 409,
      detail: err.message,
    };
  }

  if (err instanceof AccountExistsWithPassword) {
    return {
      type: "/errors/account-exists-with-password",
      title: "Ця пошта вже зареєстрована з паролем",
      status: 409,
      detail: err.message,
    };
  }

  if (err instanceof OAuthAccountAlreadyLinked) {
    return {
      type: "/errors/oauth-already-linked",
      title: "Обліковий запис Google вже прив'язано",
      status: 409,
      detail: err.message,
    };
  }

  if (err instanceof OAuthEmailNotVerified) {
    return {
      type: "/errors/oauth-email-not-verified",
      title: "Пошта Google не підтверджена",
      status: 403,
      detail: err.message,
    };
  }

  if (err instanceof OAuthStateMismatch) {
    return {
      type: "/errors/oauth-state-mismatch",
      title: "Сеанс входу недійсний",
      status: 401,
      detail: err.message,
    };
  }

  if (err instanceof InvalidCredentials) {
    return {
      type: "/errors/invalid-credentials",
      title: "Невірна пошта або пароль",
      status: 401,
      detail: err.message,
    };
  }

  if (err instanceof Unauthenticated) {
    return {
      type: "/errors/unauthenticated",
      title: "Потрібна автентифікація",
      status: 401,
      detail: err.message,
    };
  }

  if (err instanceof InvalidRefreshToken) {
    return {
      type: "/errors/invalid-refresh-token",
      title: "Сесія недійсна або завершена",
      status: 401,
      detail: err.message,
    };
  }

  if (err instanceof HttpException) {
    const res = err.getResponse();
    const detail =
      typeof res === "string"
        ? res
        : (res as Record<string, unknown>).message ?? err.message;

    return {
      type: "about:blank",
      title: err.message,
      status: err.getStatus(),
      detail: Array.isArray(detail) ? detail.join("; ") : String(detail),
    };
  }

  return {
    type: "about:blank",
    title: "Внутрішня помилка сервера",
    status: 500,
  };
}
