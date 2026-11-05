import type { CatalogFilters } from "./queries";

/**
 * Фабрика ключів запитів.
 *
 * Спільний префікс ["events"] у списку й у деталях — навмисний:
 * одна інвалідація eventKeys.all накриє обидва (після бронювання
 * зміниться кількість місць і в списку, і на сторінці події).
 *
 * Правило: усе, що використовується всередині queryFn, має бути в queryKey.
 */
export const eventKeys = {
  all: ["events"] as const,
  list: (filters: CatalogFilters) => ["events", "list", filters] as const,
  detail: (eventId: string) => ["events", "detail", eventId] as const,
};


/**
 * Обране — окремий префікс: це стан користувача, а не каталогу.
 * Інвалідація eventKeys.all після бронювання його не зачіпає, і навпаки.
 */
export const favoriteKeys = {
  all: ["favorites"] as const,
};
