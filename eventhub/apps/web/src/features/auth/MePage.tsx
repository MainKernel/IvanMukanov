import { useMutation } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { oauthErrorMessage, prepareGoogleLink, titleOf } from "../../api/queries";
import { useCurrentUser, useLogout, useLogoutAll } from "./useAuth";

export function MePage() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const logoutAll = useLogoutAll();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const oauthError = oauthErrorMessage(searchParams.get("oauthError"));

  const linkGoogle = useMutation({
    mutationFn: prepareGoogleLink,
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
  });

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

        {oauthError && (
          <p className="auth-form__error" role="alert">
            {oauthError}
          </p>
        )}

        {linkGoogle.isError && (
          <p className="auth-form__error" role="alert">
            {titleOf(linkGoogle.error)}
          </p>
        )}

        <dl className="event-page__facts">
          <dt>Пошта</dt>
          <dd>{user.email}</dd>
          <dt>Роль</dt>
          <dd>{user.role}</dd>
          <dt>ID користувача</dt>
          <dd>{user.id}</dd>
          <dt>Зареєстровано</dt>
          <dd>{new Date(user.createdAt).toLocaleString("uk-UA")}</dd>
          <dt>Google</dt>
          <dd>
            {user.googleLinked ? (
              "Прив'язано ✓"
            ) : (
              <button
                type="button"
                className="button button--ghost"
                disabled={linkGoogle.isPending}
                onClick={() => linkGoogle.mutate()}
              >
                {linkGoogle.isPending ? "Перехід…" : "Прив'язати Google"}
              </button>
            )}
          </dd>
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
