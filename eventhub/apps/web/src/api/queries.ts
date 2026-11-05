import type {
  AuthResponse,
  CreateEventRequest,
  Event,
  EventPage,
  FavoriteList,
  GoogleLinkResponse,
  LoginRequest,
  OrganizerEventList,
  Problem,
  RegisterRequest,
  UpdateEventRequest,
  UserDto,
} from "@eventhub/contracts";
import { api, getAccessToken, refreshAccessToken, setAccessToken } from "./client";

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
 * Повертає профіль поточного користувача або null, якщо сесії немає.
 * Після F5 access-токена в пам'яті немає — спершу тихо пробуємо оновитися
 * через httpOnly refresh-cookie.
 */
export async function fetchMe(): Promise<UserDto | null> {
  if (!getAccessToken()) {
    const ok = await refreshAccessToken();
    if (!ok) return null;
  }
  const { data, error } = await api.GET("/auth/me");
  if (error) return null;
  return data;
}

export async function loginUser(body: LoginRequest): Promise<AuthResponse> {
  const { data, error } = await api.POST("/auth/login", { body });
  if (error) throw error;
  setAccessToken(data.accessToken);
  return data;
}

export async function registerUser(
  body: RegisterRequest,
): Promise<AuthResponse> {
  const { data, error } = await api.POST("/auth/register", { body });
  if (error) throw error;
  setAccessToken(data.accessToken);
  return data;
}

export async function logoutUser(): Promise<void> {
  await api.POST("/auth/logout");
  setAccessToken(null);
}

export async function logoutAllDevices(): Promise<void> {
  const { error } = await api.POST("/auth/logout-all");
  if (error) throw error;
  setAccessToken(null);
}

export async function prepareGoogleLink(): Promise<GoogleLinkResponse> {
  const { data, error } = await api.POST("/auth/google/link");
  if (error) throw error;
  return data;
}

export async function fetchOrganizerEvents(): Promise<OrganizerEventList> {
  const { data, error } = await api.GET("/organizer/events");
  if (error) throw error;
  return data;
}

export async function createOrganizerEvent(
  body: CreateEventRequest,
): Promise<Event> {
  const { data, error } = await api.POST("/organizer/events", { body });
  if (error) throw error;
  return data;
}

export async function updateOrganizerEvent(
  eventId: string,
  body: UpdateEventRequest,
): Promise<Event> {
  const { data, error } = await api.PATCH("/organizer/events/{eventId}", {
    params: { path: { eventId } },
    body,
  });
  if (error) throw error;
  return data;
}

export function oauthErrorMessage(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case "google-not-configured":
      return "Вхід через Google не налаштовано на сервері (відсутні облікові дані GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).";
    case "oauth-state-mismatch":
      return "Сеанс входу через Google скасовано або недійсний. Спробуйте ще раз.";
    case "account-exists-with-password":
      return "Ця пошта вже зареєстрована з паролем. Увійдіть за паролем і натисніть «Прив'язати Google» в особистому кабінеті.";
    case "oauth-email-not-verified":
      return "Електронна пошта у вашому обліковому записі Google не підтверджена.";
    case "oauth-already-linked":
      return "Цей обліковий запис Google вже прив'язано до іншого користувача.";
    default:
      return "Не вдалося виконати вхід через Google.";
  }
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
