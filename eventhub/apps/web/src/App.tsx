import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { EventList } from "./features/catalog/EventList";
import { EventPage } from "./features/catalog/EventPage";
import { LoginPage } from "./features/auth/LoginPage";
import { MePage } from "./features/auth/MePage";
import { RequireAuth } from "./features/auth/RequireAuth";
import { useCurrentUser, useLogout } from "./features/auth/useAuth";

export function App() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();

  const onLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => navigate("/"),
    });
  };

  return (
    <main className="page">
      <header className="page__header page__header--bar">
        <div>
          <h1>
            <Link to="/" className="page__home">
              EventHub
            </Link>
          </h1>
          <p className="page__subtitle">Квитки на події</p>
        </div>

        <nav className="page__auth" aria-label="Обліковий запис">
          {user ? (
            <>
              <Link to="/me" className="page__user">
                {user.email}
              </Link>
              <button
                type="button"
                className="button button--ghost"
                disabled={logout.isPending}
                onClick={onLogout}
              >
                Вийти
              </button>
            </>
          ) : (
            <Link to="/login" className="button">
              Увійти
            </Link>
          )}
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<EventList />} />
        <Route path="/events/:eventId" element={<EventPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/me"
          element={
            <RequireAuth>
              <MePage />
            </RequireAuth>
          }
        />
      </Routes>
    </main>
  );
}
