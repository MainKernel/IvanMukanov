import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { EventList } from "./features/catalog/EventList";
import { EventPage } from "./features/catalog/EventPage";
import { LoginPage } from "./features/auth/LoginPage";
import { MePage } from "./features/auth/MePage";
import { RequireAuth } from "./features/auth/RequireAuth";
import { RequireRole } from "./features/auth/RequireRole";
import { useCurrentUser, useLogout } from "./features/auth/useAuth";
import { OrganizerEventsPage } from "./features/organizer/OrganizerEventsPage";
import { OrganizerEventEditPage } from "./features/organizer/OrganizerEventEditPage";
import { MyOrdersPage } from "./features/orders/MyOrdersPage";
import { OrderPage } from "./features/orders/OrderPage";

export function App() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();

  const onLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => navigate("/"),
    });
  };

  const isOrganizerOrAdmin =
    user?.role === "ORGANIZER" || user?.role === "ADMIN";

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
          <a
            href="http://localhost:3000/docs"
            target="_blank"
            rel="noreferrer"
            className="button button--ghost"
          >
            Swagger API
          </a>
          {user ? (
            <>
              <Link to="/orders" className="button button--ghost">
                Мої замовлення
              </Link>
              {isOrganizerOrAdmin && (
                <Link to="/organizer" className="button button--ghost">
                  Кабінет організатора
                </Link>
              )}
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
        <Route
          path="/orders"
          element={
            <RequireAuth>
              <MyOrdersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/orders/:orderId"
          element={
            <RequireAuth>
              <OrderPage />
            </RequireAuth>
          }
        />
        <Route
          path="/organizer"
          element={
            <RequireRole roles={["ORGANIZER", "ADMIN"]}>
              <OrganizerEventsPage />
            </RequireRole>
          }
        />
        <Route
          path="/organizer/events/:eventId"
          element={
            <RequireRole roles={["ORGANIZER", "ADMIN"]}>
              <OrganizerEventEditPage />
            </RequireRole>
          }
        />
      </Routes>
    </main>
  );
}
