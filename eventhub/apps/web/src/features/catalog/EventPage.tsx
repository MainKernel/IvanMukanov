import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchEvent, titleOf } from "../../api/queries";
import { eventKeys } from "../../api/queryKeys";
import { formatDate, formatPrice } from "./EventList";
import { FavoriteButton } from "./favorites";

export function EventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const location = useLocation();
  const catalogSearch =
    (location.state as { catalogSearch?: string } | null)?.catalogSearch ?? "";

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: eventKeys.detail(eventId ?? ""),
    queryFn: () => fetchEvent(eventId!),
    // Не даємо піти запиту з порожнім ідентифікатором (інакше 400).
    enabled: Boolean(eventId),
  });

  return (
    <section className="event-page">
      {/* Повертає на той самий відфільтрований каталог; сторінки беруться
          з кеша, тож поки не минув staleTime — жодного запиту. */}
      <Link to={{ pathname: "/", search: catalogSearch }} className="button button--ghost">
        ← До каталогу
      </Link>

      {isPending ? (
        <div className="event-card event-card--skeleton event-page__card" aria-busy="true">
          <span className="skeleton skeleton--title" />
          <span className="skeleton skeleton--line" />
          <span className="skeleton skeleton--line skeleton--short" />
        </div>
      ) : isError ? (
        <section className="state state--error" role="alert">
          <h2>{titleOf(error)}</h2>
          <p>
            <button type="button" className="button" onClick={() => void refetch()}>
              Спробувати ще раз
            </button>{" "}
            <Link to="/">На головну</Link>
          </p>
        </section>
      ) : (
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
      )}
    </section>
  );
}
