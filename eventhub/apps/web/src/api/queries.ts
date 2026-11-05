import type { Event, EventPage, FavoriteList, Problem } from "@eventhub/contracts";
import { api } from "./client";

/** Фільтри каталогу. Джерело правди — URL (див. useCatalogFilters). */
export interface CatalogFilters {
  city?: string | undefined;
  /** Пошук за назвою (ДЗ ЛР №4). Потрапляє в URL уже після затримки. */
  q?: string | undefined;
  from?: string | undefined;
}

/**
 * 6 подій на сторінку: із десятьма подіями в сидах це дає дві сторінки,
 * і нескінченне гортання видно.
 */
export const PAGE_SIZE = 6;

export async function fetchEvents(
  filters: CatalogFilters,
  cursor?: string | undefined,
): Promise<EventPage> {
  const { data, error } = await api.GET("/events", {
    params: {
      query: {
        ...(filters.city ? { city: filters.city } : {}),
        ...(filters.q ? { q: filters.q } : {}),
        ...(filters.from ? { from: filters.from } : {}),
        ...(cursor ? { cursor } : {}),
        limit: PAGE_SIZE,
      },
    },
  });

  // ← найважливіший рядок файлу. openapi-fetch повертає помилку значенням,
  // а TanStack Query розпізнає лише викинуту. Без throw isError ніколи
  // не стане true, а застосунок впаде далеко звідси — на data.items.
  if (error) throw error;
  return data;
}

export async function fetchEvent(eventId: string): Promise<Event> {
  const { data, error } = await api.GET("/events/{eventId}", {
    params: { path: { eventId } },
  });

  if (error) throw error;
  return data;
}

export async function fetchFavorites(): Promise<FavoriteList> {
  const { data, error } = await api.GET("/favorites");
  if (error) throw error;
  return data;
}

/**
 * Встановлює бажаний стан, а не «перемикає»: PUT і DELETE ідемпотентні,
 * тож повтор (retry, подвійний клік) не перевертає зірочку назад.
 */
export async function setFavorite(eventId: string, on: boolean): Promise<void> {
  const params = { params: { path: { eventId } } };
  const { error } = on
    ? await api.PUT("/favorites/{eventId}", params)
    : await api.DELETE("/favorites/{eventId}", params);
  if (error) throw error;
}

/**
 * Людський текст помилки з problem+json.
 * title призначений людині; машинні рішення приймаються за стабільним type.
 * Мережевий збій (бекенд зупинено) відповіді не має — тоді загальний текст.
 */
export function titleOf(error: unknown): string {
  if (typeof error === "object" && error !== null && "title" in error) {
    return String((error as Problem).title);
  }
  return "Не вдалося завантажити дані";
}

