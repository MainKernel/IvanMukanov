import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OrderStatus } from "@eventhub/contracts";
import { cancelOrder, fetchOrder, titleOf } from "../../api/queries";
import { eventKeys, orderKeys } from "../../api/queryKeys";
import { formatCountdown, useCountdown } from "./useCountdown";

export function formatOrderStatus(status: OrderStatus): string {
  switch (status) {
    case "PENDING":
      return "Очікує оплати (місця зарезервовано)";
    case "PAID":
      return "Оплачено";
    case "CANCELLED":
      return "Скасовано";
    case "EXPIRED":
      return "Час резерву вичерпано";
    case "REFUNDED":
      return "Кошти повернено";
  }
}

function HoldTimer({ holdExpiresAt }: { holdExpiresAt: string }) {
  const secondsLeft = useCountdown(holdExpiresAt);

  return (
    <div className="order-timer" role="timer" aria-live="polite">
      {secondsLeft > 0 ? (
        <>
          Місця зарезервовано ще на:{" "}
          <strong>{formatCountdown(secondsLeft)}</strong>
        </>
      ) : (
        <span role="alert">Час вийшов — резерв очікує закриття сервером.</span>
      )}
    </div>
  );
}

export function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const queryClient = useQueryClient();

  const {
    data: order,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: orderKeys.detail(orderId ?? ""),
    queryFn: () => fetchOrder(orderId!),
    enabled: Boolean(orderId),
  });

  const cancel = useMutation({
    mutationFn: () => cancelOrder(orderId!),
    onSuccess: async (updated) => {
      queryClient.setQueryData(orderKeys.detail(updated.id), updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.all }),
        queryClient.invalidateQueries({ queryKey: eventKeys.all }),
        queryClient.invalidateQueries({
          queryKey: eventKeys.seats(updated.eventId),
        }),
      ]);
    },
  });

  return (
    <section className="event-page">
      <div className="me-actions" style={{ marginTop: 0 }}>
        <Link to="/orders" className="button button--ghost">
          ← До моїх замовлень
        </Link>
        {order && (
          <Link
            to={`/events/${order.eventId}`}
            className="button button--ghost"
          >
            Сторінка події
          </Link>
        )}
      </div>

      {isPending ? (
        <div
          className="event-card event-card--skeleton order-card"
          aria-busy="true"
        >
          <span className="skeleton skeleton--title" />
          <span className="skeleton skeleton--line" />
        </div>
      ) : isError ? (
        <section className="state state--error" role="alert">
          <h2>{titleOf(error)}</h2>
          <p>
            <Link to="/orders">Повернутися до списку замовлень</Link>
          </p>
        </section>
      ) : (
        <article className="order-card">
          <div className="order-header">
            <h2 style={{ margin: 0 }}>
              {order.eventTitle ?? `Замовлення #${order.id.slice(0, 8)}`}
            </h2>
            <span
              className={`order-badge ${order.status === "PENDING" ? "order-badge--pending" : ""}`}
            >
              {formatOrderStatus(order.status)}
            </span>
          </div>

          {order.status === "PENDING" && (
            <HoldTimer holdExpiresAt={order.holdExpiresAt} />
          )}

          <h3 style={{ marginTop: "1.25rem", marginBottom: "0.5rem" }}>
            Обрані місця ({order.items.length})
          </h3>
          <ul className="order-items">
            {order.items.map((item) => (
              <li key={item.seatId}>
                <span>
                  Ряд <strong>{item.rowLabel}</strong>, місце{" "}
                  <strong>{item.number}</strong>
                </span>
                <span>{(item.price.amount / 100).toFixed(0)} грн</span>
              </li>
            ))}
          </ul>

          <dl className="event-page__facts">
            <dt>Загальна сума</dt>
            <dd>
              <strong>{(order.total.amount / 100).toFixed(0)} грн</strong>
            </dd>
            <dt>Створено</dt>
            <dd>{new Date(order.createdAt).toLocaleString("uk-UA")}</dd>
          </dl>

          {cancel.isError && (
            <p
              className="auth-form__error"
              role="alert"
              style={{ marginTop: "1rem" }}
            >
              {titleOf(cancel.error)}
            </p>
          )}

          {order.status === "PENDING" && (
            <div className="me-actions">
              <button
                type="button"
                className="button button--ghost"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate()}
              >
                {cancel.isPending ? "Скасовуємо…" : "Скасувати замовлення"}
              </button>
            </div>
          )}
        </article>
      )}
    </section>
  );
}

