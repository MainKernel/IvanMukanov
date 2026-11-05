import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchOrganizerEvents } from "../../api/queries";
import { organizerKeys } from "../../api/queryKeys";
import { formatDate, formatPrice } from "../catalog/EventList";
import { ErrorState, EventListSkeleton } from "../catalog/states";

export function OrganizerEventsPage() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: organizerKeys.all,
    queryFn: fetchOrganizerEvents,
  });

  if (isPending) return <EventListSkeleton />;
  if (isError) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }

  const events = data.items;

  return (
    <section className="event-page">
      <h2>Кабінет організатора ({events.length} подій)</h2>

      {events.length === 0 ? (
        <section className="state state--empty">
          <h2>У вас поки немає власних подій</h2>
        </section>
      ) : (
        <ul className="event-list">
          {events.map((e) => (
            <li key={e.id} className="event-card event-card--row">
              <div className="event-card__link">
                <strong className="event-card__title">{e.title}</strong>
                <span className="event-card__meta">
                  {e.venue.city} · {e.venue.name}
                </span>
                <span className="event-card__meta">
                  {formatDate(e.startsAt)} · від {formatPrice(e)}
                </span>
              </div>
              <div className="organizer-actions">
                <Link
                  to={`/organizer/events/${e.id}`}
                  className="button button--ghost"
                >
                  Редагувати
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

