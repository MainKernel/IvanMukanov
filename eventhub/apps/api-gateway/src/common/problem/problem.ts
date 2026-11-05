import { HttpException } from "@nestjs/common";
import type { Problem } from "@eventhub/contracts";
import {
  EventCancelledError,
  EventNotFound,
  FavoritesUnavailable,
  ForbiddenOrderAccess,
  InvalidCursor,
  OrderAlreadyCancelled,
  OrderNotFound,
  RequestValidationFailed,
  SeatAlreadyHeld,
} from "./domain-errors";

export interface ProblemBody extends Problem {
  errors?: unknown;
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

  if (err instanceof FavoritesUnavailable) {
    return {
      type: "/errors/favorites-unavailable",
      title: "Не вдалося оновити обране",
      status: 503,
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
