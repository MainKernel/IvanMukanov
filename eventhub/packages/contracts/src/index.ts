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
