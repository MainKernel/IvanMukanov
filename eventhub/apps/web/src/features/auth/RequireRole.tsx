import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import type { Role } from "@eventhub/contracts";
import { useCurrentUser } from "./useAuth";

/**
 * RequireRole не захищає даних: як і RequireAuth, він лише прибирає екран,
 * яким користувач однаково не зміг би скористатися. Справжній захист — на сервері
 * у RolesGuard та в умові WHERE у репозиторії.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
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

  if (!roles.includes(user.role)) {
    return (
      <section className="state state--error" role="alert">
        <h2>Недостатньо прав доступу</h2>
        <p>Цей розділ доступний лише організаторам та адміністраторам.</p>
        <Link to="/" className="button">
          До каталогу
        </Link>
      </section>
    );
  }

  return <>{children}</>;
}

