import { z } from "zod";
import type { components, paths } from "./generated/schema";

// UUID нашого домену – версії 7 (сортовані за часом).
// z.string().uuid() їх ВІДХИЛЯЄ: його регулярний вираз вимагає версію 1–5.
// Тому перевіряємо форму, а не версію.
const uuidLike = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Очікується ідентифікатор у форматі UUID",
  );

export const listEventsQuery = z.object({
  city: z.string().trim().min(1).optional(),
  from: z.string().date().optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListEventsQuery = z.infer<typeof listEventsQuery>;

export const eventIdParam = z.object({
  eventId: uuidLike,
});
export type EventIdParam = z.infer<typeof eventIdParam>;

export const createOrderBody = z.object({
  eventId: uuidLike,
  buyerId: uuidLike,
  quantity: z.coerce.number().int().min(1).max(10),
});
export type CreateOrderBody = z.infer<typeof createOrderBody>;

export const orderIdParam = z.object({
  orderId: uuidLike,
});
export type OrderIdParam = z.infer<typeof orderIdParam>;

export const cancelOrderQuery = z.object({
  buyerId: uuidLike,
});
export type CancelOrderQuery = z.infer<typeof cancelOrderQuery>;

// ============================================================================
// Тип-рівнева перевірка узгодженості Zod-схем зі згенерованими типами OpenAPI
// (Частина рішення ADR-0002: якщо в openapi.yaml зміниться набір полів або їхні
// базові типи, компілятор TypeScript зламає збірку на етапі typecheck/build).
// ============================================================================
type OpenApiListEventsQuery = NonNullable<
  paths["/events"]["get"]["parameters"]["query"]
>;
type OpenApiEventIdParam = paths["/events/{eventId}"]["get"]["parameters"]["path"];
type OpenApiCreateOrderBody = components["schemas"]["CreateOrderRequest"];
type OpenApiOrderIdParam = paths["/orders/{orderId}"]["get"]["parameters"]["path"];
type OpenApiCancelOrderQuery =
  paths["/orders/{orderId}"]["delete"]["parameters"]["query"];

type AssertStructuralMatch<TZod, TOpenApi> =
  TZod extends TOpenApi
    ? Required<TOpenApi> extends Required<TZod>
      ? true
      : never
    : never;

const _assertListEventsQuery: AssertStructuralMatch<
  ListEventsQuery,
  OpenApiListEventsQuery
> = true;
const _assertEventIdParam: AssertStructuralMatch<
  EventIdParam,
  OpenApiEventIdParam
> = true;
const _assertCreateOrderBody: AssertStructuralMatch<
  CreateOrderBody,
  OpenApiCreateOrderBody
> = true;
const _assertOrderIdParam: AssertStructuralMatch<
  OrderIdParam,
  OpenApiOrderIdParam
> = true;
const _assertCancelOrderQuery: AssertStructuralMatch<
  CancelOrderQuery,
  OpenApiCancelOrderQuery
> = true;

void _assertListEventsQuery;
void _assertEventIdParam;
void _assertCreateOrderBody;
void _assertOrderIdParam;
void _assertCancelOrderQuery;
