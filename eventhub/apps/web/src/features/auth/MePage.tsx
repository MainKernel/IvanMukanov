import { useNavigate } from "react-router-dom";
import { useCurrentUser, useLogout, useLogoutAll } from "./useAuth";

export function MePage() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const logoutAll = useLogoutAll();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => navigate("/login", { replace: true }),
    });
  };

  const handleLogoutAll = () => {
    logoutAll.mutate(undefined, {
      onSettled: () => navigate("/login", { replace: true }),
    });
  };

  return (
    <section className="event-page">
      <article className="event-card event-page__card">
        <h2 className="event-page__title">Особистий кабінет</h2>
        <dl className="event-page__facts">
          <dt>Пошта</dt>
          <dd>{user.email}</dd>
          <dt>Роль</dt>
          <dd>{user.role}</dd>
          <dt>ID користувача</dt>
          <dd>{user.id}</dd>
          <dt>Зареєстровано</dt>
          <dd>{new Date(user.createdAt).toLocaleString("uk-UA")}</dd>
        </dl>

        <div className="me-actions">
          <button
            type="button"
            className="button"
            disabled={logout.isPending}
            onClick={handleLogout}
          >
            Вийти
          </button>
          <button
            type="button"
            className="button button--ghost"
            disabled={logoutAll.isPending}
            onClick={handleLogoutAll}
          >
            Вийти з усіх пристроїв
          </button>
        </div>
      </article>
    </section>
  );
}
