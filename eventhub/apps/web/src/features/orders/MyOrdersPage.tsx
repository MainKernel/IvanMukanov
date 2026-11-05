import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMyOrders, titleOf } from "../../api/queries";
import { orderKeys } from "../../api/queryKeys";
import { formatOrderStatus } from "./OrderPage";

export function MyOrdersPage() {
  const {
    data: orders,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: orderKeys.list(),
    queryFn: fetchMyOrders,
  });

  return (
    <section className="event-page">
      <Link to="/" className="button button--ghost">
        ← До каталогу
      </Link>

      <h2 style={{ marginTop: "1.5rem" }}>Мої замовлення</h2>

      {isPending ? (
        <ul className="event-list" aria-busy="true">
          {[0, 1].map((i) => (
            <li key={i} className="event-card event-card--skeleton">
              <span className="skeleton skeleton--title" />
              <span className="skeleton skeleton--line" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <section className="state state--error" role="alert">
          <h2>{titleOf(error)}</h2>
          <button
            type="button"
            className="button"
            onClick={() => void refetch()}
          >
            Спробувати ще раз
          </button>
        </section>
      ) : orders.length === 0 ? (
        <section className="state state--empty">
          <h2>Замовлень поки немає</h2>
          <p>Оберіть подію у каталозі та забронюйте бажані місця.</p>
          <Link to="/" className="button">
            Переглянути події
          </Link>
        </section>
      ) : (
        <ul className="event-list">
          {orders.map((order) => (
            <li key={order.id} className="event-card event-card--row">
              <Link
                to={`/orders/${order.id}`}
                className="event-card__link"
              >
                <strong className="event-card__title">
                  {order.eventTitle ?? `Замовлення #${order.id.slice(0, 8)}`}
                </strong>
                <span className="event-card__meta">
                  Місць: {order.items.length} (
                  {order.items
                    .map((i) => `${i.rowLabel}-${i.number}`)
                    .join(", ")}
                  ) · Сума: {(order.total.amount / 100).toFixed(0)} грн
                </span>
                <span className="event-card__meta">
                  Статус: {formatOrderStatus(order.status)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

