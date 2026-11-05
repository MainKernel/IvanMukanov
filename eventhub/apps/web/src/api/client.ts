import createClient from "openapi-fetch";
import type { paths } from "@eventhub/contracts";

const BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Access-токен живе лише у змінній модуля в оперативній пам'яті (див. ADR-0005).
 * Після перезавантаження сторінки (F5) він відновлюється через httpOnly refresh-cookie.
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(t: string | null): void {
  accessToken = t;
}

let refreshInFlight: Promise<boolean> | null = null;

export function refreshAccessToken(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        setAccessToken(null);
        return false;
      }
      const data = (await res.json()) as { accessToken: string };
      setAccessToken(data.accessToken);
      return true;
    } catch {
      setAccessToken(null);
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function withToken(input: Request): Request {
  const token = getAccessToken();
  if (!token) return input;
  const headers = new Headers(input.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return new Request(input, { headers, credentials: "include" });
}

async function authFetch(input: Request): Promise<Response> {
  const retry = input.clone(); // тіло можна прочитати лише раз

  const response = await fetch(withToken(input));

  const pathname = new URL(input.url, window.location.origin).pathname;
  // Не повторюємо маршрути входу/реєстрації/оновлення/виходу:
  // 401 на вході означає «невірний пароль», а не «протермінований токен».
  const isPublicAuthRoute = /\/auth\/(login|register|refresh|logout)$/.test(
    pathname,
  );
  if (response.status !== 401 || isPublicAuthRoute) return response;

  const refreshed = await refreshAccessToken();
  if (!refreshed) return response;

  return fetch(withToken(retry));
}

/**
 * Типізований клієнт API з автоматичним додаванням Bearer-токена
 * та прозорим оновленням сесії при 401.
 */
export const api = createClient<paths>({
  baseUrl: BASE_URL,
  fetch: authFetch,
});
