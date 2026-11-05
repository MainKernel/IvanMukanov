// Публічне обличчя пакета. Усі інші пакети імпортують типи звідси,
// а не з ./generated напряму — так шлях до згенерованого файлу
// лишається деталлю реалізації, яку можна змінити без правок у споживачах.
export * from "./schemas";
export type { paths, components } from "./generated/schema";

import type { components } from "./generated/schema";

// Зручні псевдоніми: у компонентах пишемо Event, а не
// components["schemas"]["Event"] — читабельніше і коротше.
export type Event = components["schemas"]["Event"];
export type EventPage = components["schemas"]["EventPage"];
export type VenueSummary = components["schemas"]["VenueSummary"];
export type Money = components["schemas"]["Money"];
export type Problem = components["schemas"]["Problem"];
export type FavoriteList = components["schemas"]["FavoriteList"];
export type Order = components["schemas"]["Order"];
export type OrderStatus = components["schemas"]["OrderStatus"];
export type CreateOrderRequest = components["schemas"]["CreateOrderRequest"];
export type Role = components["schemas"]["Role"];
export type User = components["schemas"]["User"];
export type UserDto = components["schemas"]["User"];
export type RegisterRequest = components["schemas"]["RegisterRequest"];
export type LoginRequest = components["schemas"]["LoginRequest"];
export type AuthResponse = components["schemas"]["AuthResponse"];
export type RefreshResponse = components["schemas"]["RefreshResponse"];
export type GoogleLinkResponse = components["schemas"]["GoogleLinkResponse"];
export type OrganizerEventList = components["schemas"]["OrganizerEventList"];
export type CreateEventRequest = components["schemas"]["CreateEventRequest"];
export type UpdateEventRequest = components["schemas"]["UpdateEventRequest"];
export type UpdateUserRoleRequest =
  components["schemas"]["UpdateUserRoleRequest"];
