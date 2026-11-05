import { z } from "zod";
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