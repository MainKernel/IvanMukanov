import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useCurrentUser } from "./useAuth";

/**
 * RequireAuth не захищає даних: справжня перевірка — на сервері у JwtAuthGuard.
 * Компонент лише прибирає зайвий екран і перенаправляє на /login із збереженням
 * цільового маршруту, щоб після входу повернути користувача назад (наприклад, на /me).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: user, isPending } = useCurrentUser();
  const location = useLocation();

  if (isPending) {
    return (
      <div className="event-card event-card--skeleton" aria-busy="true">
        <span className="skeleton skeleton--title" />
        <span className="skeleton skeleton--line" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
}
