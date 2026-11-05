import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOrder,
  fetchEvent,
  fetchSeatMap,
  titleOf,
} from "../../api/queries";
import { eventKeys, orderKeys } from "../../api/queryKeys";
import { useCurrentUser } from "../auth/useAuth";
import { formatDate, formatPrice } from "./EventList";
import { FavoriteButton } from "./favorites";
import { SeatMap } from "./SeatMap";

const MAX_SEATS_PER_ORDER = 10;

function extractConflictSeatIds(error: unknown): string[] {
  if (
    typeof error === "object" &&
    error !== null &&
    "seatIds" in error &&
    Array.isArray((error as { seatIds?: unknown }).seatIds)
  ) {
    return (error as { seatIds: string[] }).seatIds;
  }
  return [];
}

export function EventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  const catalogSearch =
    (location.state as { catalogSearch?: string } | null)?.catalogSearch ?? "";

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [conflictIds, setConflictIds] = useState<Set<string>>(() => new Set());
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: eventKeys.detail(eventId ?? ""),
    queryFn: () => fetchEvent(eventId!),
    // Не даємо піти запиту з порожнім ідентифікатором (інакше 400).
    enabled: Boolean(eventId),
  });

  const {
    data: seatMapData,
    isPending: isSeatsPending,
    refetch: refetchSeats,
  } = useQuery({
    queryKey: eventKeys.seats(eventId ?? ""),
    queryFn: () => fetchSeatMap(eventId!),
    enabled: Boolean(eventId),
  });

  const order = useMutation({
    mutationFn: createOrder,
    onSuccess: async (createdOrder) => {
      setSelected(new Set());
      setConflictIds(new Set());
      setSelectionNotice(null);
      // Після створення замовлення інвалідуємо три ключі:
      // 1) карту місць, 2) саму подію (змінився availableSeats), 3) список замовлень.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: eventKeys.seats(eventId!) }),
        queryClient.invalidateQueries({ queryKey: eventKeys.all }),
        queryClient.invalidateQueries({ queryKey: orderKeys.all }),
      ]);
      navigate(`/orders/${createdOrder.id}`);
    },
    onError: (err) => {
      const takenIds = extractConflictSeatIds(err);
      if (takenIds.length > 0) {
        setConflictIds(new Set(takenIds));
        setSelected((prev) => {
          const next = new Set(prev);
          for (const id of takenIds) {
            next.delete(id);
          }
          return next;
        });
        void refetchSeats();
        void refetch();
      }
    },
  });

  function toggleSeat(seatId: string): void {
    setConflictIds((prev) => {
      if (!prev.has(seatId)) return prev;
      const next = new Set(prev);
      next.delete(seatId);
      return next;
    });
    setSelectionNotice(null);

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seatId)) {
        next.delete(seatId);
      } else {
        if (next.size >= MAX_SEATS_PER_ORDER) {
          setSelectionNotice("Можна обрати не більше 10 місць за одне замовлення.");
          return prev;
        }
        next.add(seatId);
      }
      return next;
    });
  }

  /**
   * Ключ ідемпотентності народжується в обробнику натискання, а не всередині
   * createOrder: при автоматичному повторі запиту (наприклад після 401 -> refresh)
   * використовуватиметься той самий ключ.
   */
  function buy(): void {
    if (!eventId || selected.size === 0) return;
    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    order.mutate({
      eventId,
      seatIds: [...selected],
      idempotencyKey: crypto.randomUUID(), // ← саме тут
    });
  }

  const seats = seatMapData?.seats ?? [];
  const selectedSeats = seats.filter((s) => selected.has(s.id));
  const totalCents = selectedSeats.reduce((sum, s) => sum + s.price.amount, 0);

  return (
    <section className="event-page">
      {/* Повертає на той самий відфільтрований каталог; сторінки беруться
          з кеша, тож поки не минув staleTime — жодного запиту. */}
      <Link
        to={{ pathname: "/", search: catalogSearch }}
        className="button button--ghost"
      >
        ← До каталогу
      </Link>

      {isPending ? (
        <div
          className="event-card event-card--skeleton event-page__card"
          aria-busy="true"
        >
          <span className="skeleton skeleton--title" />
          <span className="skeleton skeleton--line" />
          <span className="skeleton skeleton--line skeleton--short" />
        </div>
      ) : isError ? (
        <section className="state state--error" role="alert">
          <h2>{titleOf(error)}</h2>
          <p>
            <button
              type="button"
              className="button"
              onClick={() => void refetch()}
            >
              Спробувати ще раз
            </button>{" "}
            <Link to="/">На головну</Link>
          </p>
        </section>
      ) : (
        <>
          <article className="event-card event-page__card">
            <div className="event-page__head">
              <h2 className="event-page__title">{data.title}</h2>
              <FavoriteButton eventId={data.id} />
            </div>
            {data.description && <p>{data.description}</p>}
            <dl className="event-page__facts">
              <dt>Коли</dt>
              <dd>{formatDate(data.startsAt)}</dd>
              <dt>Де</dt>
              <dd>
                {data.venue.name}, {data.venue.city}
              </dd>
              <dt>Ціна</dt>
              <dd>від {formatPrice(data)}</dd>
              <dt>Вільних місць</dt>
              <dd>{data.availableSeats}</dd>
            </dl>
          </article>

          <section className="seat-section" aria-label="Вибір місць">
            <h3>Оберіть місця</h3>

            {isSeatsPending ? (
              <div aria-busy="true">
                <span className="skeleton skeleton--line" />
              </div>
            ) : (
              <SeatMap
                seats={seats}
                selectedIds={selected}
                conflictIds={conflictIds}
                onToggleSeat={toggleSeat}
              />
            )}

            {selectionNotice && (
              <p className="auth-form__error" role="alert">
                {selectionNotice}
              </p>
            )}

            {order.isError && (
              <p className="auth-form__error" role="alert">
                {titleOf(order.error)}
              </p>
            )}

            <div className="order-bar">
              <div className="order-bar__summary">
                {selectedSeats.length > 0 ? (
                  <>
                    <strong>
                      Обрано місць: {selectedSeats.length} (
                      {selectedSeats
                        .map((s) => `${s.rowLabel}-${s.number}`)
                        .join(", ")}
                      )
                    </strong>
                    <span>
                      Сума до сплати: {(totalCents / 100).toFixed(0)} грн
                    </span>
                  </>
                ) : (
                  <span className="event-card__meta">
                    Натисніть на вільні місця на схемі (до 10 місць за раз)
                  </span>
                )}
              </div>

              <button
                type="button"
                className="button"
                disabled={selected.size === 0 || order.isPending}
                onClick={buy}
              >
                {order.isPending ? "Резервуємо…" : "Замовити"}
              </button>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
