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

// toLowerCase() на межі: інакше Student@Example.com і student@example.com
// стали б двома різними користувачами.
const email = z.string().trim().toLowerCase().email().max(254);

export const registerBody = z.object({
  email,
  password: z.string().min(10).max(128),
});
export type RegisterBody = z.infer<typeof registerBody>;

export const loginBody = z.object({
  email,
  password: z.string().min(1).max(128),
});
export type LoginBody = z.infer<typeof loginBody>;

export const listEventsQuery = z.object({
  city: z.string().trim().min(1).optional(),
  // Пошук за назвою (ДЗ ЛР №4). Межі збігаються з minLength/maxLength в openapi.yaml.
  q: z.string().trim().min(1).max(100).optional(),
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

export const favoriteEventIdParam = z.object({
  eventId: uuidLike,
});
export type FavoriteEventIdParam = z.infer<typeof favoriteEventIdParam>;

// ЛР №6: Схеми для кабінету організатора (organizerId в тілі НЕ оголошується —
// будь-яке передане значення буде автоматично відкинуте Zod, власник береться з токена).
export const createEventBody = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  startsAt: z.string().datetime(),
  venueId: uuidLike,
  minPriceCents: z.coerce.number().int().min(0),
  availableSeats: z.coerce.number().int().min(0).default(80),
});
export type CreateEventBody = z.infer<typeof createEventBody>;

export const updateEventBody = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    startsAt: z.string().datetime().optional(),
    venueId: uuidLike.optional(),
    minPriceCents: z.coerce.number().int().min(0).optional(),
    availableSeats: z.coerce.number().int().min(0).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Потрібно передати щонайменше одне поле для оновлення",
  });
export type UpdateEventBody = z.infer<typeof updateEventBody>;

export const userIdParam = z.object({
  userId: uuidLike,
});
export type UserIdParam = z.infer<typeof userIdParam>;

export const updateUserRoleBody = z.object({
  role: z.enum(["USER", "ORGANIZER", "ADMIN"]),
});
export type UpdateUserRoleBody = z.infer<typeof updateUserRoleBody>;

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
type OpenApiFavoriteEventIdParam =
  paths["/favorites/{eventId}"]["parameters"]["path"];
type OpenApiRegisterBody = components["schemas"]["RegisterRequest"];
type OpenApiLoginBody = components["schemas"]["LoginRequest"];
type OpenApiCreateEventBody = components["schemas"]["CreateEventRequest"];
type OpenApiUpdateEventBody = components["schemas"]["UpdateEventRequest"];
type OpenApiUserIdParam =
  paths["/admin/users/{userId}/role"]["patch"]["parameters"]["path"];
type OpenApiUpdateUserRoleBody = components["schemas"]["UpdateUserRoleRequest"];

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
const _assertFavoriteEventIdParam: AssertStructuralMatch<
  FavoriteEventIdParam,
  OpenApiFavoriteEventIdParam
> = true;
const _assertRegisterBody: AssertStructuralMatch<
  RegisterBody,
  OpenApiRegisterBody
> = true;
const _assertLoginBody: AssertStructuralMatch<
  LoginBody,
  OpenApiLoginBody
> = true;
const _assertCreateEventBody: AssertStructuralMatch<
  CreateEventBody,
  OpenApiCreateEventBody
> = true;
const _assertUpdateEventBody: AssertStructuralMatch<
  UpdateEventBody,
  OpenApiUpdateEventBody
> = true;
const _assertUserIdParam: AssertStructuralMatch<
  UserIdParam,
  OpenApiUserIdParam
> = true;
const _assertUpdateUserRoleBody: AssertStructuralMatch<
  UpdateUserRoleBody,
  OpenApiUpdateUserRoleBody
> = true;

void _assertListEventsQuery;
void _assertEventIdParam;
void _assertCreateOrderBody;
void _assertOrderIdParam;
void _assertCancelOrderQuery;
void _assertFavoriteEventIdParam;
void _assertRegisterBody;
void _assertLoginBody;
void _assertCreateEventBody;
void _assertUpdateEventBody;
void _assertUserIdParam;
void _assertUpdateUserRoleBody;
